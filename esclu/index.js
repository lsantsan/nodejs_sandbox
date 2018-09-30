/*
Node.js 8 the Right Way - Chapter 6
Description: A command-line utility program with a number of useful commands
            for getting information into and out of Elasticsearch.
*/

'use strict';

const fs = require('fs');
const request = require('request');
const program = require('commander');
const pkg = require('./package.json');

const fullUrl = (path = "") => {
    let url = `http://${program.host}:${program.port}/`;
    if (program.index) {
        url += program.index + '/';
        if (program.type) {
            url += program.type + '/';
        }
    }
    return url + path.replace(/^\/*/, "");
};

const handleResponse = (err, res, body) => {
    if (program.json) {
        console.log(JSON.stringify(err || body, null, ' '));
    } else {
        if (err) throw err;
        console.log(body);
    }
};

program
    .version(pkg.version)
    .description(pkg.description)
    .usage('[options] <command> [...]')
    .option('-o, --host <hostname>', 'hostname [localhost]', 'localhost')
    .option('-p, --port <number>', 'port number [9200]', '9200')
    .option('-j, --json', 'format output as JSON')
    .option('-i, --index <name>', 'which index to use')
    .option('-t, --type <type>', 'default type for bulk operations')
    .option('-f, --filter <filter>', 'source filter for query results');

program
    .command('url [path]')
    .description('generate the URL for the options and path (default is /)')
    .action((path = '/') => console.log(fullUrl(path)));

program
    .command('get [path]')
    .description('perform an HTTP GET request for path (default is /)')
    .action((path = '/') => {
        const options = {
            url: fullUrl(path),
            json: program.json,
        };
        request(options, handleResponse);
    });

program
    .command('create-index')
    .description('create an index')
    .action(() => {
        if (!program.index) {
            const msg = 'No index specified! Use --index <name>';
            if (!program.json) throw Error(msg);
            console.log(JSON.stringify({error: msg}));
            return;
        }
        request.put(fullUrl(), handleResponse);
    });

program
    .command('list-indices')
    .alias('li')
    .description('get a list of indices in this cluster')
    .action(() => {
        const path = program.json ? '_all' : '_cat/indices?v';
        request({url: fullUrl(path), json: program.json}, handleResponse)
    });

program
    .command('bulk <file>')
    .description('read and perform bulk options from the specified file')
    .action(file => {
        fs.stat(file, (err, stats) => {
            if (err) {
                if (program.json) {
                    console.log(JSON.stringify(err));
                    return;
                }
                throw err;
            }
            const options = {
                url: fullUrl('_bulk'),
                json: true,
                headers: {
                    'content-length': stats.size, //setting length since the file will be streamed to the server
                    'content-type': 'application/json'
                }
            };
            const req = request.post(options); //this variable works as both writable and readable streams
            const stream = fs.createReadStream(file);
            stream.pipe(req); //pipe data from the file to the request. "req" works as writable stream
            req.pipe(process.stdout); //then, pipe the response to the console. "req" works as readable stream

            /*The benefit of the approach above is that neither the bulk file nor the response from Elasticsearch needs
            to be wholly resident in the Node.js process's memory.*/
        });
    });

program
    .command('query [queries...]')
    .alias('q')
    .description('perform an Elasticsearch query')
    .action((queries = []) => {
        const options = {
            url: fullUrl('_search'),
            json: program.json,
            qs: {} //query string: the 'request' framework will take the qs's attributes, encode them, and append to the URL (i.e. ?q=authors:Twain)
        };

        if(queries && queries.length){
            options.qs.q =queries.join(' ');
        }

        if (program.filter) {
            options.qs._source = program.filter;
        }
        request(options, handleResponse);
    });

program.parse(process.argv);

if (!program.args.filter(arg => typeof arg === 'object').length) {
    program.help();
}