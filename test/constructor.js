"use strict";

const should       = require('chai').should(),
      sinon        = require('sinon'),
      split        = require('../express-split'),
      express      = require('express'),
      request      = require('supertest');

describe('#constructor', function() {
  let app;

  beforeEach(function() {
    app = express();
  });

  it('uses the default options', function(done) {
    app.use(split({}));
    app.get('/test1', function (req, res) {
      const split_private = req.split.__test();
      split_private.options.should.equal(split_private.default_options);
      done();
    });
    request(app)
      .get('/test1')
      .end();
  });

  it('overrides the default options with provided options', function(done) {
    const options = {
      experiments:          {'test1': {options: ['1', '2', '3']}},
      storage:              'mysql',
      db_pool:              {query: () => {}},
      db_table_experiments: 'split_experiments_custom',
      db_table_users:       'split_experiments_custom',
      use_cookies:          true,
      cookie_name:          '_splituid_custom',
      cookie_max_age:       12345
    };
    app.use(split(options));
    app.get('/test1', function (req, res) {
      const split_private = req.split.__test();
      JSON.stringify(split_private.options).should.equal(JSON.stringify(options));
      done();
    });
    request(app)
      .get('/test1')
      .end();
  });

});
