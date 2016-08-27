"use strict";

const uuid = require('node-uuid');

const ExpressSplit = (user_options) => {
  const default_options = {
    experiments: {},
    storage:                     'in-memory', // in-memory, mysql
    db_pool:                     false,
    db_table_experiments:        'split_experiments',
    db_table_users:              'split_users',
    use_cookies:                 false,
    cookie_name:                 '_splituid',
    cookie_max_age:              15552000000 // 180 days in milliseconds
  };
  const options = Object.assign(default_options, user_options);

  const storage = new SplitStorage(options);
  const gui     = new SplitGui();

  const check_to_set_cookie = (req, res) => {
    if (options.use_cookies === true) {
      if (req.split.id === false) {
        if (req.cookies[options.cookie_name]) {
          req.split.id = parseInt(req.cookies[options.cookie_name].substring(0, 9), 10);
        } else {
          const uid = parseInt(uuid.v4().replace(/[^0-9]/g, '').substring(0, 9), 10);
          req.split.id = uid;
        }
      }
      res.cookie(options.cookie_name, req.split.id, { maxAge: options.cookie_max_age });
    }
  };

  return function(req, res, next) {
    req.split = {
      id: false,
      set_id: (user_id) => {
        if (!isNaN(user_id) && 
            parseInt(Number(user_id)) === user_id && 
            !isNaN(parseInt(user_id, 10))) {
          req.split.id = user_id;
        } else {
          throw new Error(`Split set_id() must receive an integer`);
        }
      },
      start: (experiment_id, callback) => {
        check_to_set_cookie(req, res);
        storage.addUserOption(req.split.id, experiment_id, callback);
      },
      get: (experiment_id, callback) => {
        check_to_set_cookie(req, res);
        return storage.getUserOption(req.split.id, experiment_id, callback);
      },
      finish: (experiment_id, callback) => {
        check_to_set_cookie(req, res);
        storage.addConversion(experiment_id, req.split.id, callback);
      },
      results: (callback) => {
        return storage.getResults(callback);
      },
      gui: (req, res) => {
        let experiments = {};
        const NormalP = (x) => {
          const d1 = 0.0498673470, d2 = 0.0211410061, d3 = 0.0032776263, d4 = 0.0000380036, d5 = 0.0000488906, d6 = 0.0000053830;
          const a = Math.abs(x);
          let t = 1.0 + a * (d1 + a * (d2 + a * (d3 + a * (d4 + a * (d5 + a * d6)))));
          t *= t; t *= t; t *= t; t *= t;
          t = 1.0 / (t + t);
          if (x >= 0)
            t = 1 - t;
          return t;
        }
        const calculate_results = (a_impressions, a_conversions, b_impressions, b_conversions) => {
          const c_t = a_impressions;
          const v_t = b_impressions;
          const c_c = a_conversions;
          const v_c = b_conversions;
          if (c_t < 15 || v_t < 15) {
            return {success: false, error: 'Not enough data'};
          }
          const c_p = c_c / c_t;
          const v_p = v_c / v_t;
          const std_error = Math.sqrt((c_p * (1 - c_p) / c_t) + (v_p * (1 - v_p) / v_t));
          const z_value = (v_p - c_p) / std_error;
          let p_value = NormalP(z_value);
          if (p_value > 0.5)
            p_value = 1 - p_value;
          p_value = Math.round(p_value * 1000) / 1000;
          const es = ((((v_c/v_t) / (c_c/c_t)) * 100) - 100).toFixed(1);
          return {
            success: true,
            p_value: p_value,
            significance: ((1 - p_value) * 100).toFixed(1) + '%',
            is_significant: p_value < 0.05,
            effect_size: (es > 0 ? '+' : '-') + Math.abs(es) + '%'
          };
        }
        return storage.getResults((experiments_results) => {
          Object.keys(experiments_results.results).forEach((r) => {
            const result = experiments_results.results[r];
            const experiment_name = r;
            if (!experiments.hasOwnProperty(experiment_name)) {
              experiments[experiment_name] = {results: {}};
            }
            delete result.experiment;
            experiments[experiment_name].results = result;
            let control_data = false;
            const control_option = options.experiments[experiment_name].options[0];
            Object.keys(experiments[experiment_name].results).forEach((rr) => {
              const result = experiments_results.results[r][rr];
              if (control_option === rr) {
                control_data = {impressions: result.impressions, conversions: result.conversions};
              }
            });
            Object.keys(experiments[experiment_name].results).forEach((rr) => {
              const result = experiments_results.results[r][rr];
              if (control_option !== rr) {
                result.calculations = calculate_results(control_data.impressions, control_data.conversions, result.impressions, result.conversions);
              } else {
                result.calculations = {success: true, p_value: '', is_significant: true, effect_size: ''};
              }
            })
          });
          gui.render(req, res, experiments);
        });
      },
      __test: () => {
        // Exposes private objects for unit testing
        return {
          user_options:    user_options,
          default_options: default_options,
          options:         options,
          storage:         storage
        }
      }
    };
    next();
}};

class SplitStorage {
  constructor(options) {
    if (options.storage == 'in-memory') {
      this.storage = new SplitStorageInMemory(options);
    } else if (options.storage == 'mysql') {
      this.storage = new SplitStorageMysql(options);
    } else {
      throw new Error(`Split does not support the storage type ${options.storage}`);
    }
  }

  addUserOption(user_id, experiment_id, callback) {
    this.storage.addUserOption(user_id, experiment_id, callback);
  }

  getUserOption(user_id, experiment_id, callback) {
    return this.storage.getUserOption(user_id, experiment_id, callback);
  }

  addImpression(experiment_id, chosen_option, callback) {
    this.storage.addImpression(experiment_id, chosen_option, callback);
  }

  addConversion(experiment_id, user_id, callback) {
    this.storage.addConversion(experiment_id, user_id, callback);
  }

  getResults(callback) {
    return this.storage.getResults(callback);
  }
}

class SplitStorageAbstract {
  constructor() {
    const methods = ['addUserOption', 'getUserOption', 'addImpression', 'addConversion', 'getResults'];
    Object.keys(methods).forEach((m) => {
      if (this[methods[m]] === undefined) {
        throw new TypeError(`The method ${methods[m]} must be overriden when deriving from SplitStorageAbstract`);
      }
    })
  }

  generateRandomOption(user_id, experiment_options) {
    const chosen_index = Math.floor(seeded_rand(user_id) * experiment_options.length);
    return experiment_options[chosen_index];
  }
}

class SplitStorageInMemory extends SplitStorageAbstract {
  constructor(options) {
    super();
    this.users        = {};
    this.results      = {};
    this.experiments  = options.experiments;
    Object.keys(options.experiments).forEach((e) => {
      this.results[e] = {};
      const ops = options.experiments[e].options;
      Object.keys(ops).forEach((o) => {
        this.results[e][ops[o]] = {
          impressions: 0,
          conversions: 0
        };
      })
    })
  }

  addUserOption(user_id, experiment_id, callback) {
    if (!this.users[user_id]) {
      this.users[user_id] = {};
    }
    if (!this.users[user_id][experiment_id]) {
      const chosen_option = this.generateRandomOption(user_id, this.experiments[experiment_id].options);
      this.users[user_id][experiment_id] = {option: chosen_option, converted: false};
      this.addImpression(experiment_id, chosen_option, callback);
    } else {
      callback();
    }
  }

  getUserOption(user_id, experiment_id, callback) {
    try {
      callback(this.users[user_id][experiment_id].option);
    } catch (e) {
      callback(this.experiments[experiment_id].options[0]);
    }
  }

  addImpression(experiment_id, chosen_option, callback) {
    this.results[experiment_id][chosen_option].impressions++;
    callback();
  }

  addConversion(experiment_id, user_id, callback) {
    if (this.users[user_id][experiment_id].converted === false) {
      this.getUserOption(user_id, experiment_id, (option) => {
        this.results[experiment_id][option].conversions++;
        this.users[user_id][experiment_id].converted = true;
        callback();
      });
    } else {
      callback();
    }
  }
  
  getResults(callback) {
    callback({results: this.results});
  }
}

class SplitStorageMysql extends SplitStorageAbstract {
  // The construction of the tables is async, assuming that it won't take long and no users will be missed
  constructor(options) {
    super();
    this.pool   = options.db_pool;
    this.tables = {
      experiments: options.db_table_experiments,
      users:       options.db_table_users
    };
    this.experiments = options.experiments;
    // Create tables
    this.pool.query(`CREATE TABLE IF NOT EXISTS ?? (user_id INT NOT NULL, experiment VARCHAR(45) NOT NULL, experiment_option VARCHAR(45) NOT NULL, converted TINYINT(1) NOT NULL DEFAULT 0, UNIQUE INDEX user_option (user_id ASC, experiment ASC, experiment_option ASC))`, [this.tables.users], (err) => {
      if (err){
        console.error(err, 'Creating the users table failed');
      }
    });
    this.pool.query(`CREATE TABLE IF NOT EXISTS ?? (experiment VARCHAR(45) NOT NULL, experiment_option VARCHAR(45) NOT NULL, weight FLOAT NULL DEFAULT NULL, impressions INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0, UNIQUE INDEX experiment_options (experiment ASC, experiment_option ASC))`, [this.tables.experiments], (err) => {
      if (err){
        console.error(err, 'Creating the experiments table failed');
      } else {
        // Add new experiments
        Object.keys(this.experiments).forEach((e) => {
          const ops = this.experiments[e].options;
          Object.keys(ops).forEach((o) => {
            this.pool.query(`INSERT INTO ?? (experiment, experiment_option) VALUES (?, ?) ON DUPLICATE KEY UPDATE experiment_option=experiment_option`, [this.tables.experiments, e, ops[o]], (err) => {
              if (err){
                console.error(err, `Inserting the experiment option ${ops[o]} under ${e} failed`);
              }
            });
          })
        })
      }
    });
  }

  addUserOption(user_id, experiment_id, callback) {
    this.getUserOption(user_id, experiment_id, (option) => {
      if (option === null) {
        const chosen_option = this.generateRandomOption(user_id, this.experiments[experiment_id].options);
        this.pool.query(`INSERT INTO ?? (user_id, experiment, experiment_option) VALUES (?, ?, ?)`, [this.tables.users, user_id, experiment_id, chosen_option], (err, result) => {
          if (err){
            console.error(err, `Inserting a user option failed: ${user_id}, ${experiment_id} - ${chosen_option}`);
          }
          this.addImpression(experiment_id, chosen_option, callback);
        });
      } else {
        callback();
      }
    });
  }

  getUserOption(user_id, experiment_id, callback) {
    this.pool.query(`SELECT experiment_option FROM ?? WHERE user_id = ? AND experiment = ? LIMIT 1`, [this.tables.users, user_id, experiment_id], (err, result) => {
      if (err){
        console.error(err, `Select user option failed: ${user_id}, ${experiment_id}`);
        callback(this.experiments[experiment_id][0]);
      } else if (result.length === 0) {
        callback(null);
      } else {
        callback(result[0]['experiment_option']);
      }
    });
  }

  addImpression(experiment_id, chosen_option, callback) {
    this.pool.query(`UPDATE ?? SET impressions = impressions + 1 WHERE experiment = ? AND experiment_option = ? LIMIT 1`, [this.tables.experiments, experiment_id, chosen_option], (err) => {
      if (err){
        console.error(err, `Incrementing impressions failed: ${experiment_id}, ${chosen_option}`);
      }
      callback();
    });
  }

  addConversion(experiment_id, user_id, callback) {
    this.getUserOption(user_id, experiment_id, (chosen_option) => {
      this.pool.query(`UPDATE ?? SET converted = 1 WHERE user_id = ? AND  experiment = ? AND experiment_option = ? LIMIT 1`, [this.tables.users, user_id, experiment_id, chosen_option], (err, result) => {
        if (err){
          console.error(err, `Updating conversion failed: ${user_id}, ${experiment_id} - ${chosen_option}`);
          callback();
        } else if (result.changedRows === 1) {
          this.pool.query(`UPDATE ?? SET conversions = conversions + 1 WHERE experiment = ? AND experiment_option = ? LIMIT 1`, [this.tables.experiments, experiment_id, chosen_option], (err) => {
            if (err){
              console.error(err, `Incrementing conversions failed: ${experiment_id}, ${chosen_option}`);
            }
            callback();
          });
        } else {
          callback();
        }
      });
    });
  }

  getResults(callback) {
    this.pool.query(`SELECT * FROM ??`, [this.tables.experiments], (err, results) => {
      if (err){
        console.error(err, 'Fetching experiments failed');
        callback({results: []});
      } else {
        let experiments = {};
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (typeof experiments[r.experiment] === 'undefined') {
            experiments[r.experiment] = {};
          }
          experiments[r.experiment][r.experiment_option] = {
            impressions: r.impressions,
            conversions: r.conversions
          };
        }
        callback({results: experiments});
      }
    });
  }
}

class SplitGui {
  constructor() {
    this.hbs = require('handlebars');
    this.fs  = require('fs');
  }

  render(req, res, results) {
    const view_path = __dirname + '/views/main.handlebars';
    this.fs.readFile(view_path, 'utf-8', (err, data) => {
      if (err) {
        res.send(`
          <h1>Express-Split error</h1>
          <h3>Could not read the template file</h3>
          <pre>${JSON.stringify(err, null, 2)}</pre>
          <h3>Results data</h3>
          <pre>${JSON.stringify(results, null, 2)}</pre>
        `);
        res.end();
        return;
      }
      const template = this.hbs.compile(data);
      res.send(template({experiments: results}));
    });
  }
}

const seeded_rand = (seed) => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

module.exports = ExpressSplit;
