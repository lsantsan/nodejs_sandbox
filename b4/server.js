'use strict';

const express = require('express');
const morgan = require('morgan');
const nconf = require('nconf');
const pkg = require('./package.json');

//config setup
nconf.argv().env('__'); //nconf should load arg variable ( ​​node​​ ​​server.js ​​--es:host=myhost.com) first, then env variables that use '__' (es__host=myhost.com ​​node​​ ​​server.js​)
nconf.defaults({conf: `${__dirname}/config.json`}); //if no arg variables nor env variables are defined, nconf will use the config.json
nconf.file(nconf.get('conf'));

//server setup
const app = express();
app.use(morgan('dev'));
app.get('/api/version', (req, res) => {
    res.status(200).send(pkg.version);
});

require('./lib/search.js')(app, nconf.get('es')); //adding search service
require('./lib/bundle.js')(app, nconf.get('es')); //adding search service

app.listen(nconf.get('port'), () => console.log('Ready!'));