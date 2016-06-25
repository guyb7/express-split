"use strict";

const split        = require('../express-split'),
      express      = require('express'),
      request      = require('supertest');

describe('#storage-in-memory', function() {
  let app;

  beforeEach(function() {
    app = express();
    app.use(split({
      experiments: {
       'test1': {options: ['1', '2', '3']}
      }
    }));
  });

  xit('chooses a random option', function(done) {
  });

  xit('remembers the chosen option between requests', function(done) {
  });

  xit('adds only a single impression for each user', function(done) {
  });

  xit('adds only a single conversion for each user', function(done) {
  });

});
