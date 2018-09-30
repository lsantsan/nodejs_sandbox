'use strict';
const cheerio = require('cheerio');

module.exports = rdf => {
    const $ = cheerio.load(rdf);
    const book = {};

    book.id = +$('pgterms\\:ebook') // ':' symbol needs to be escaped to avoid confusion with CSS pseudo selector (i.e. :hoover)
        .attr('rdf:about')
        .replace('ebooks/', "");
    book.title = $('dcterms\\:title').text();
    book.authors = $('pgterms\\:agent pgterms\\:name')
        .toArray().map(elem => $(elem).text());
    book.subjects = $('[rdf\\:resource$="/LCSH"]') // CSS selector -> [...]
        .parent().find('rdf\\:value')
        .toArray().map(elem => $(elem).text());

    return book;
};