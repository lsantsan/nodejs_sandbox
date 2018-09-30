/**
 * Provides API endpoints for searching the books index.
 */

'use strict';

const request = require('request');
const rp = require('request-promise');

module.exports = (app, es) => {
    const url = `http://${es.host}:${es.port}/${es.books_index}/book/_search`;

    /**
     * Search for books by matching a particular field value.
     * Example: /api/search/books/authors/Twain
     */
    app.get('/api/search/books/:field/:query', (req, res) => {
        const esReqBody = {
            size: 10,
            query: {
                match: {
                    [req.params.field]: req.params.query //computed property name: The expression inside the brackets is evaluated at runtime, and the result is used as the key
                }
            }
        };

        const options = {url, json: true, body: esReqBody};
        request.get(options, (err, esRes, esResBody) => {
            if (err) {
                res.status(502).json({
                    error: 'bad_gateway',
                    reason: err.code
                });
                return;
            }
            if (esRes.statusCode !== 200) {
                res.status(esRes.statusCode).json(esResBody);
                return;
            }
            res.status(200).json(esResBody.hits.hits.map(({_source}) => _source)); //({_source})=> _source is destructuring assignment
        });
    });

    /**
     * Collect suggested terms for a given field based on a given query.
     * Example: /api/suggest/authors/lipman
     * Result: lilian (score:0.66, freq: 26), lippmann (score: 0.66, freq:5)
     */
    app.get('/api/suggest/:field/:query', (req, res) => {
        const esReqBody = {
            size: 0, //no matching documents returned, only suggestions
            suggest: {
                suggestions: {
                    text: req.params.query,
                    term: {
                        field: req.params.field,
                        suggest_mode: 'always'
                    }

                }
            }
        };
        const options = {url, json: true, body: esReqBody};
        rp(options)
            .then(esResBody => res.status(200).json(esResBody.suggest.suggestions))
            .catch(({error}) => res.status(error.status || 502).json(error));
    });

};




