'use strict';

const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const LDJClient = require('../lib/ldj-client');

describe('LDJClient', ()=>{
    let stream = null;
    let client = null;

    beforeEach( ()=>{
        stream = new EventEmitter();
        client = new LDJClient(stream); //connects the LDJClient to the "stream"
    });

    it('should emit a message event from a single data event', done => {
        client.on('message', message => {
            assert.deepEqual(message, {test:'boo', foo: 'bar'});
            done();
        });
        //trigger test
        stream.emit('data', '{"foo":"bar", "test":"boo"}\n');
    });

    it('should emit a message event from split data events', done => {
       client.on('message', message =>{
           assert.deepEqual(message, {foo: 'bar'});
           done();
       });
       stream.emit('data', '{"foo":');

       /*nextTick() schedules code as a callback to be executed as soon as the current code finishes.
        * The difference between setTimeout(callback, 0) and process.nextTick(callback) is that the latter will execute before the next spin of the event loop.
        * By contrast, setTimeout will wait for the event loop to spin at least once, allowing for other queued callbacks to be executed.*/
       process.nextTick(()=> stream.emit('data',' "bar"}\n'));

    });
} );