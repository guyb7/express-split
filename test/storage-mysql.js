"use strict";

const split   = require('../express-split'),
      express = require('express'),
      request = require('supertest'),
      sinon   = require('sinon');
      // mysql   = require('mysql');

describe('#storage-in-memory', function() {
  let app, pool;
  const seed = Math.floor(Math.random() * 10000) + 1000;

  const beforeEachFunction = function() {
    pool = false;
    app = express();
    app.use(split({
      storage:     'mysql',
      db_pool:     pool,
      experiments: {
       'test1': {options: ['1', '2', '3']}
      }
    }));
  };

  beforeEach(beforeEachFunction);

  // Need a proper mysql-mock library in order to correctly test this

  xit('chooses a random option', function(done) {
  });

  xit('remembers the chosen option between requests', function(done) {
  });

  xit('adds only a single impression for each user', function(done) {
  });

  xit('adds only a single conversion for each user', function(done) {
  });
});
