"use strict";

const split        = require('../express-split'),
      express      = require('express'),
      request      = require('supertest');

describe('#storage-in-memory', function() {
  let app;
  const seed = Math.floor(Math.random() * 10000) + 1000;

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
      .end(function(err, res){
        if (err) throw err;
      });
  });

  // Run 10 times to better avoid false positives
  for (let i = 1; i <= 10; i++) {
    it('remembers the chosen option between requests #' + i, function(done) {
      app.get('/test1', function (req, res) {
        req.split.set_id(seed);
        req.split.start('test1', function() {
          req.split.get('test1', function(variant) {
            res.send({variant: variant});
          });
        });
      });

      let variant = false;
      const second_call = function() {
        request(app)
          .get('/test1')
          .expect({
            variant: variant
          }).end(function(err, res){
            if (err) throw err;
            done();
          });
      };

      request(app)
        .get('/test1')
        .expect(function(res) {
          variant = res.body.variant;
          second_call();
        })
        .end(function(err, res){
          if (err) throw err;
        });
    });
  }

  xit('adds only a single impression for each user', function(done) {
  });

  xit('adds only a single conversion for each user', function(done) {
  });

});
