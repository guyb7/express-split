"use strict";

const should       = require('chai').should(),
      split        = require('../express-split'),
      express      = require('express'),
      cookieParser = require('cookie-parser'),
      request      = require('supertest');

describe('#cookies', function() {
  let app;

  beforeEach(function() {
    app = express();
    app.use(cookieParser());
    app.use(split({
      use_cookies: true,
      experiments: {
       'test1': {options: ['1', '2', '3']}
      }
    }));
  });

  it('sets a cookie with random user_id', function(done) {
    app.get('/test1', function (req, res) {
      req.split.start('test1', function() {
        res.send();
      });
    });
    request(app)
      .get('/test1')
      .expect('set-cookie', /_splituid=\d{0,9};/, done);
  });

  it('sets a cookie with provided user_id', function(done) {
    app.get('/test1', function (req, res) {
      req.split.set_id(123456789);
      req.split.start('test1', function() {
        res.send();
      });
    });
    request(app)
      .get('/test1')
      .expect('set-cookie', /_splituid=123456789;/, done);
  });

  it('reads an existing cookie and sets the user_id to max 9 digits', function(done) {
    app.get('/test1', function (req, res) {
      req.cookies._splituid = '987654321000000000';
      req.split.start('test1', function() {
        res.send();
      });
    });
    request(app)
      .get('/test1')
      .expect('set-cookie', /_splituid=987654321;/, done);
  });
});
