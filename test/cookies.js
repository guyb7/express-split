"use strict";

const should       = require('chai').should(),
      split        = require('../express-split'),
      express      = require('express'),
      cookieParser = require('cookie-parser'),
      request      = require('supertest');

describe('#cookies', function() {
  let app;

  before(function() {
    app = express();
    app.use(cookieParser());
    app.use(split({
      use_cookies: true,
      experiments: {
       'test1': {options: ['1', '2', '3']}
      }
    }));
    app.get('/test1', function (req, res) {
      req.split.start('test1', function() {
        res.send();
      });
    });
  });

  it('sets a cookie', function(done) {
    request(app)
      .get('/test1')
      .expect('set-cookie', /^ab=%7B%22selection-test%22%3A0%7D;/, done);
  });
});
