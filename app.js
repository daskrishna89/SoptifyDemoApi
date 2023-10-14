    var express = require('express');
    var request = require('request'); 
    
    const bodyParser = require('body-parser');
    const dotenv = require('dotenv');
    dotenv.config();  // Get ENV Config
    // JWT Library
    const jwt = require("jsonwebtoken");

    const {Sequelize, DataTypes, Op} = require("sequelize");
    const sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USERNAME,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: 'mysql'
        }
    );

    // Check DB Authorisation
    sequelize.authenticate().then(() => {
        console.log('Connection has been established successfully.');
    }).catch((error) => {
        console.error('Unable to connect to the database: ', error);
    });

    const Track = sequelize.define("track", {
        id: {
          type: DataTypes.INTEGER,
          primaryKey:true,
          autoIncrement: true,
          allowNull: false
        },
        track_id: {
          type: DataTypes.STRING,
        },
        irsc_id: {
            type: DataTypes.STRING,
            unique: true
        },
        name: {
            type: DataTypes.STRING,
        },
        popularity: {
            type: DataTypes.INTEGER,
        },
        preview_url: {
            type: DataTypes.STRING,
        },
        album_id: {
            type: DataTypes.STRING,
        },
        album_name: {
            type: DataTypes.STRING,
        }, 
        album_type: {
            type: DataTypes.STRING,
        },
        album_release_date: {
            type: DataTypes.DATE,
        }
    });

    const Image = sequelize.define("image", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true,
            allowNull: false
        },
        height: {
            type: DataTypes.INTEGER,
        },
        width: {
            type: DataTypes.INTEGER,
        },
        image_url: {
            type: DataTypes.TEXT,
        },
        // track_id: {
        //     type: DataTypes.INTEGER,
        //     references: {
        //         model: 'tracks',   // 'tracks' refers to table name
        //         key: 'id',         // 'id' refers to column name in tracks table
        //     }
        // }
    });

    const Artist = sequelize.define("artist", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true,
            allowNull: false
        },
        artist_id: {
            type: DataTypes.STRING,
        },
        irsc_id: {
            type: DataTypes.STRING,
        },
        artist_name: {
            type: DataTypes.STRING,
        },
        artist_type: {
            type: DataTypes.STRING,
        },
        artist_href: {
            type: DataTypes.STRING,
        },
        artist_uri: {
            type: DataTypes.STRING,
        },
        // track_id: {
        //     type: DataTypes.INTEGER,
        //     references: {
        //         model: 'tracks',   // 'tracks' refers to table name
        //         key: 'id',         // 'id' refers to column name in tracks table
        //     }
        // }
    });

    Track.hasMany(Artist, {
        foreignKey: 'track_id'
    });
    Artist.belongsTo(Track);

    Track.hasMany(Image, {
        foreignKey: 'track_id'
    });
    Image.belongsTo(Track);

    var client_id                = process.env.CLIENT_ID;      // Client ID From ENV
    var client_secret            = process.env.CLIENT_SECRET;  // Client Secret From ENV
    var redirect_uri             = process.env.REDIRECT_URI;   // Redirect Uri From ENV
    var spotify_refresh_token    = process.env.SPOTIFY_REFRESH_TOKEN;   // Spotify refresh token ENV



    // Bearer Tokens Generate Here
    function generateAccessToken(user) {
        return jwt.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET, {expiresIn: "60m"}) 
    }
    // refreshTokens For JWT Generate Here
    let refreshTokens = []
    function generateRefreshToken(user) {
        const refreshToken = 
        jwt.sign(user, process.env.JWT_REFRESH_TOKEN_SECRET, {expiresIn: "24h"})
        refreshTokens.push(refreshToken)
        return refreshToken
    }

    // Validate JWT Token As Middleware
    function validateToken(req, res, next) {
        //get token from request header
        const authHeader = req.headers["authorization"];
        // console.log(authHeader);
        // console.log(typeof authHeader);
        if (typeof authHeader == 'undefined' || authHeader == 'undefined' ){
        //    console.log('If');
            res.sendStatus(400).send("Token is not present at header");
        }else{
            // console.log('else');
            const token = authHeader.split(" ")[1];
            //the request header contains the token "Bearer <token>", split the string and use the second value in the split array.
            if (token == null) res.sendStatus(400).send("Token not present")
            jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) { 
                // console.log(user);
                // console.log(err);
                res.status(403).send("Token invalid")
            }
            else {
                // console.log(user);
                req.user = user
                next() //proceed to the next action in the calling function
            }
            }) //end of jwt.verify()
        }
        
        
    } //end of function

    // App Declearation Here
    var app = express();  

    // create application/json parser
    app.use(bodyParser.json());
    // create application/x-www-form-urlencoded parser
    app.use(bodyParser.urlencoded({ extended: false }));

    // Get Token Functionality Defines Here
    app.get('/Login/getToken', function(req, res) {

        let username = req.headers['user_name'];
        let pwd = req.headers['password'];
        // console.log(req.headers);
        if(username == 'user_2023' && pwd == 'MSAyMDI1#zIDIwOj'){
            let currentTime = Date();
            const bearerToken = generateAccessToken ({time: currentTime})
            const refreshToken = generateRefreshToken ({time: currentTime})
            res.send({
                'bearer_token':bearerToken,
            });
        }else{
            res.status(400);
            res.send('Invalid Credential');
        }
    });

    // Post Spotify Track By IRSC and Store it
    app.post('/Tracks', validateToken, function(req, res){
        console.log(req.body.irsc);
        let req_irsc = req.body.irsc;

        sequelize.sync().then(() => {
            console.log('Sequelise Sync successfully!');
         

            // requesting access token and use it for search by IRSC track
            var spotifyTokenReq = {
                url: 'https://accounts.spotify.com/api/token',
                headers: { 'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')) },
                form: {
                    grant_type: 'refresh_token',
                    refresh_token: spotify_refresh_token
                },
                json: true
            };
            // console.log(spotifyTokenReq);
            request.post(spotifyTokenReq, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    let spotify_access_token = body.access_token;
                    var searchReq = {
                        url: process.env.SPOTIFY_API_ENDPOINT+'v1/search?q=isrc:'+req_irsc+'&type=track',
                        headers: {
                            'Authorization': 'Bearer '+spotify_access_token
                        },
                        json: true
                    };
                    // console.log(searchReq);
                    request.get(searchReq, function(error, response, body) {
                        
                        if (!error && response.statusCode === 200) {
                            
                                if(body.tracks.items.length > 0){
                                    
                                    let highPopularity   = 0;
                                    let highPopularTrack = [];
                                    body.tracks.items.forEach((track, index) => { 
                                        
                                        if(track.popularity > highPopularity){
                                            highPopularity = track.popularity;
                                            highPopularTrack = track;
                                        }
            
                                    }); 

                                    // If Highest Populary Array is set store to Track DB
                                    if(Object.keys(highPopularTrack).length > 0){
                                        
                                        Track.create({
                                            track_id: highPopularTrack.id,
                                            irsc_id: req_irsc,
                                            name: highPopularTrack.name,
                                            popularity: highPopularTrack.popularity,
                                            preview_url: highPopularTrack.preview_url,
                                            album_id: highPopularTrack.album.id,
                                            album_name: highPopularTrack.album.name,
                                            album_type: highPopularTrack.album.type,
                                            album_release_date: highPopularTrack.album.release_date
                                        }).then(trackResult => {
                                            console.log('data inserted');
                                            // console.log(trackResult);
                                            // console.log(trackResult.id);

                                            let insertedTrackId = trackResult.id;

                                            // Insert Images to DB
                                            if(highPopularTrack.album.images.length > 0){
                                                highPopularTrack.album.images.forEach(image => {
                                                    // console.log(image);

                                                    Image.create({
                                                        height: image.height,
                                                        width: image.width,
                                                        image_url: image.url,
                                                        track_id: insertedTrackId
                                                    }).catch((error) => {
                                                        console.error('Failed to create a new record In Image Table : ', error);
                                                    });

                                                });
                                            }

                                            // Insert Artist to DB
                                            if(highPopularTrack.album.artists.length > 0){
                                                highPopularTrack.album.artists.forEach(artist => {
                                                    // console.log(artist);

                                                    Artist.create({
                                                        artist_id: artist.id,
                                                        irsc_id: req_irsc,
                                                        artist_name: artist.name,
                                                        artist_type: artist.type,
                                                        artist_href: artist.href,
                                                        artist_uri: artist.uri,
                                                        track_id: insertedTrackId,
                                                    }).catch((error) => {
                                                        console.error('Failed to create a new record In Artist Table : ', error);
                                                    });


                                                });
                                            }


                                            res.status(200);
                                            res.send({'status': true, 'msg':'Track details with '+req_irsc+' IRSC stored successfully.'})

                                        }).catch((error) => {
                                            // console.error('Failed to create a new record : ', error);
                                            // console.log(error);
                                            res.status(400);
                                            res.send({'status': false, 'msg':'Requested IRSC('+req_irsc+') is already exists.'})
                                        });
                                        

                                    }else{
                                        res.status(400);
                                        res.send({'status': false, 'msg':'No data found from Spotify API respect of '+req_irsc+' IRSC id.'})
                                    }
                                    
                                    // console.log(highPopularTrack);
                                }
                        }else{
                            res.status(400);
                            res.send({'status': false, 'msg':'Error In Spotify API.'});
                        }
                    });
                }else{
                    res.status(400);
                    res.send('Error In Spotify Token.');
                    
                }
            });

        }).catch((error) => {
            // console.error('Unable to create table : ', error);
            res.status(400);
            res.send('Error In db sync connection.');
        });
    });

    // Get By IRSC ID
    app.get('/Lists/Track', validateToken, function(req, res){
        // console.log(req.query.irsc);
        let req_irsc = req.query.irsc;

        Track.findAll({
            where: {
                irsc_id: req_irsc
            },
            include: [
                {
                    model: Image,
                },
                {
                    model: Artist,
                }
            ]
        }).then(trackLists => {
            // console.log(trackLists);
            res.status(200);
            if(trackLists.length > 0){
                res.send({'status': true,'msg':'Data Found', 'data': trackLists});

            }else{
                res.send({'status': false,'msg':'No Data Found', 'data': []});

            }
        }).catch((error) => {
            console.error('Failed to retrieve data : ', error);
            res.status(400);
            res.send('Failed to retrieve track data.');
        });

        // res.send('by-irsc');
    });

    // Get By Aritist Name
    app.get('/Lists/Artist', validateToken, function(req, res){
        console.log(req.query.name);
        let req_artist = req.query.name;

        Artist.findAll({
            where: {
                artist_name: {
                    [Op.startsWith]: req_artist
                }
            }
        }).then(artistLists => {
            // console.log(trackLists);
            res.status(200);
            if(artistLists.length > 0){
                res.send({'status': true,'msg':'Data Found', 'data': artistLists});

            }else{
                res.send({'status': false,'msg':'No Data Found', 'data': []});

            }
        }).catch((error) => {
            console.error('Failed to retrieve data : ', error);
            res.status(400);
            res.send('Failed to retrieve artist data.');
        });

    });



    app.listen(process.env.PORT, function () {
        console.log('Example app listening at http://localhost:'+process.env.PORT+'/');
    });