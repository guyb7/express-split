"use strict";

const split        = require('../express-split'),
      express      = require('express'),
      request      = require('supertest');

describe('#storage-in-memory', function() {
  let app;
  const seed = Math.floor(Math.random() * 10000) + 1000;

  const beforeEachFunction = function() {
    app = express();
    app.use(split({
      experiments: {
       'test1': {options: ['1', '2', '3']}
      }
    }));
  };

  beforeEach(beforeEachFunction);

  it('chooses a random option', function(done) {
    // Run 1000 tests, check that the distribution is pretty much equal between the variants
    app.get('/start', function (req, res) {
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
      .get('/start')
      .end(function(err, res){
        if (err) throw err;
      });
  });

  it('remembers the chosen option between requests', function(done) {
    // Run 15 times to better avoid false positives
    const it_recursive = function(n) {
      if (n < 1) {
        done();
        return;
      }
      beforeEachFunction();
      app.get('/start', function (req, res) {
        req.split.set_id(seed + (n * 17));
        req.split.start('test1', function() {
          req.split.get('test1', function(variant) {
            res.send({variant: variant});
          });
        });
      });

      request(app)
        .get('/start')
        .expect(function(res) {
          const variant = res.body.variant;
          request(app)
            .get('/start')
            .expect({
              variant: variant
            })
            .end(function(err, res){
              if (err) throw err;
              it_recursive(n - 1);
            });
        })
        .end(function(err, res){
          if (err) throw err;
        });
    }
    it_recursive(15);
  });

  it('adds only a single impression for each user', function(done) {
    app.get('/start', function (req, res) {
      req.split.set_id(seed);
      for (let i = 0; i < 10; i++) {
        req.split.start('test1', function() {
          res.send();
        });
      }
    });
    app.get('/results', function (req, res) {
      req.split.set_id(seed);
      req.split.results(function(results) {
        res.send(results.results);
      });
    });

    request(app)
      .get('/start')
      .expect(function() {
        request(app)
          .get('/results')
          .expect(function(res) {
            for (let i in res.body.test1) {
              if (res.body.test1[i].impressions > 1) {
                console.log(JSON.stringify(res.body));
                throw new Error('More than one impression for the same user');
              }
            }
            done();
          })
          .end(function(err, res){
            if (err) throw err;
          });
      })
      .end(function(err, res){
        if (err) throw err;
      });
  });

  it('adds only a single conversion for each user', function(done) {
    app.get('/start', function (req, res) {
      req.split.set_id(seed);
      req.split.start('test1', function() {
        res.send();
      });
    });
    app.get('/finish', function (req, res) {
      req.split.set_id(seed);
      for (let i = 0; i < 10; i++) {
        req.split.finish('test1', function() {
          res.send();
        });
      }
    });
    app.get('/results', function (req, res) {
      req.split.set_id(seed);
      req.split.results(function(results) {
        res.send(results.results);
      });
    });

    request(app)
      .get('/start')
      .expect(function() {
        request(app)
          .get('/finish')
          .expect(function(res) {
            request(app)
              .get('/results')
              .expect(function(res) {
                for (let i in res.body.test1) {
                  if (res.body.test1[i].conversions > 1) {
                    console.log(JSON.stringify(res.body));
                    throw new Error('More than one impression for the same user');
                  }
                }
                done();
              })
              .end(function(err, res){
                if (err) throw err;
              });
          })
          .end(function(err, res){
            if (err) throw err;
          });
      })
      .end(function(err, res){
        if (err) throw err;
      });
  });
});
