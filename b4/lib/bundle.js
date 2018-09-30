/**
 * Provides API endpoints for working with book bundles.
 */
'use strict';

const rp = require('request-promise');

module.exports = (app, es) => {
    const url = `http://${es.host}:${es.port}/${es.bundles_index}/bundle`;

    const handleError = (res, esResErr) => {
        res.status(esResErr.statusCode || 502).json(esResErr.error);
    };

    /**
     * Create a new bundle with the specified name.
     * curl -X POST http://<host>:<port>/api/bundle?name=<name>
     */
    app.post('/api/bundle', (req, res) => {
        const bundle = {
            name: req.query.name || "",
            books: []
        };

        const options = {url, json: true, body: bundle};
        rp.post(options)
            .then(esResBody => res.status(201).json(esResBody))
            .catch(({error}) => res.status(error.status || 502).json(error));
    });

    /**
     * Retrieve a given bundle.
     * curl http://<host>:<port>/api/bundle/<id>
     */
    app.get('/api/bundle/:id', async (req, res) => {
        const options = {
            url: `${url}/${req.params.id}`,
            json: true
        };
        try {
            const esResBody = await rp(options);
            res.status(200).json(esResBody);
        } catch (esResErr) {
            res.status(esResErr.status || 502).json(esResErr.error);
        }
    });

    /**
     * Set the specified bundle's name with the specified name.
     * curl -X PUT http://<host>:<port>/api/bundle/<id>/name/<name>
     */
    app.put('/api/bundle/:id/name/:name', async (req, res) => {
        const bundleUrl = `${url}/${req.params.id}`;

        try {
            const bundle = (await rp({url: bundleUrl, json: true}))._source; //performs a get call
            bundle.name = req.params.name;

            const esResBody = await rp.put({url: bundleUrl, body: bundle, json: true});
            res.status(200).json(esResBody);
        } catch (esResErr) {
            res.status(esResErr.statusCode || 502).json(esResErr);
        }
    });

    /**
     * Put a book into a bundle by its id.
     * curl -X PUT http://<host>:<port>/api/bundle/<id>/book/<pgid>
     */
    app.put('/api/bundle/:id/book/:pgid', async (req, res) => {
        const bundleUrl = `${url}/${req.params.id}`;
        const bookUrl = `http://${es.host}:${es.port}/${es.books_index}/book/${req.params.pgid}`;

        try {
            //Request the bundle and book in parallel
            const [bundleRes, bookRes] = await Promise.all([
                rp({url: bundleUrl, json: true}),
                rp({url: bookUrl, json: true})
            ]);

            //Extract bundle and book information from responses
            const {_source: bundle, _version: version} = bundleRes; //destructuring assignment: the _source property from bundleRes will be extracted and renamed to bundle
            const {_source: book} = bookRes; //destructuring assignment

            const index = bundle.books.findIndex(book => book.id === req.params.pgid);
            if (index === -1) {
                bundle.books.push({
                    id: req.params.pgid,
                    title: book.title
                });
            }

            //Put the updated bundle back in the index.
            const esResBody = await rp.put({
                url: bundleUrl,
                qs: {version},
                body: bundle,
                json: true
            });

            res.status(200).json(esResBody);

        } catch (esResErr) {
            handleError(res, esResErr);
        }
    });

    /**
     * Delete a bundle entirely.
     * curl -X DELETE htpp://<host>:<port>/api/bundle/<id>
     */
    app.delete('/api/bundle/:id', async (req, res) => {
        const bundleUrl = `${url}/${req.params.id}`;

        try {
            const esResBody = await rp.delete({url: bundleUrl, json: true});
            res.status(200).json(esResBody);
        } catch (esResErr) {
            handleError(res, esResErr);
        }
    });

    /**
     * Remove a book from a bundle
     * curl -X DELETE http://<host>:<port>/api/bundle/<id>/book/<pgid>
     */
    app.delete('/api/bundle/:id/book/:pgid', async (req, res) => {
        const bundleUrl = `${url}/${req.params.id}`;

        try {
            const bundleRes = await rp({url: bundleUrl, json: true});
            const {_source: bundle, _version: version} = bundleRes;

            const index = bundle.books.findIndex(book => book.id === req.params.pgid);
            if (index === -1) {
                throw {
                    statusCode: 409,
                    error: {
                        message: `Book ${req.params.pgid} not found in bundle.`
                    }
                }
            }

            bundle.books.splice(index, 1);
            const esResBody = await rp.put({
                url: bundleUrl,
                qs: {version},
                body: bundle,
                json: true
            });
            res.status(200).json(esResBody);
        } catch (esResErr) {
            handleError(res, esResErr);
        }
    });
};