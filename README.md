# SoptifyDemoApi
 This API is integrated using NodeJs/Express JS, backend is MySql Database with relation. 
 Clone this Source code, execute command npm install and Add the .env at root directory and run npm start to start the application.

## Detailing of Appliction
 First I have created an app into spotify developer end and retrieve the client id and secret key. Using this spotify credential I am calling spotify api internally. By using search api of spotify retrieve the track details with respect to the IRSC id and store them into mysql db. After that created two end points for retrieve tracklist and artist list respect of ISRC code and artist name respectively.

## API urls are given below

*  **[GET] http://localhost:3100/Login/getToken**
   * This api is use to generate bearer token tor further use. In this API username and password is static. Once retrieve the token from this api this will use to next api that is store track by irsc.
     

*  **[POST] http://localhost:3100/Tracks/**
   * This api is use to search the requested irsc fron Spotify External API. Once Spoify return data from external API then application store the metadata of this response to database. Basically here store the track details, artist details and images came from spotify api. 

*  **[GET] http://localhost:3100/Lists/Track?irsc=USWB11403680**
   * This api basically query to database respect of stored irsc value. IRSC value is unique so only one record will return from database.

*  **[GET] http://localhost:3100/Lists/Artist?name=the beatles**
   * This api use to query to database respect of artist name. This query return list of artist from db and here like search is implemented.
