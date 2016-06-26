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

  it('chooses a random option', function(done) {
    // Run 1000 tests, check that the distribution is pretty much equal between the variants
    app.get('/test1', function (req, res) {
      const seed = Math.floor(Math.random() * 10000) + 1000;
      for (let i = seed; i < seed + 1000; i++) {
        req.split.set_id(i);
        req.split.start('test1', function() {
          res.send();
        });
      }
      req.split.results((results) => {
        for (let r in results.results.test1) {
          // At least 29% impressions for each variant is considered normal
          if (results.results.test1[r].impressions < 290) {
            console.log(JSON.stringify(results));
            throw new Error('Got uneven distribution');
          }
        }
        done();
      });
    });
    request(app)
      .get('/test1')
      .end();
  });

  xit('remembers the chosen option between requests', function(done) {
  });

  xit('adds only a single impression for each user', function(done) {
  });

  xit('adds only a single conversion for each user', function(done) {
  });

});
