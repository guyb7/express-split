"use strict";

const uuid = require('node-uuid');

const ExpressSplit = (user_options) => {
  const options = Object.assign({
    experiments: {},
    storage:                     'in-memory', // in-memory, mysql
    db_pool:                     false,
    db_table_experiments:        'split_experiments',
    db_table_users:              'split_users',
    use_cookies:                 false,
    cookie_name:                 '_splituid',
    cookie_max_age:              15552000000 // 180 days in milliseconds
  }, user_options);

  const storage = new SplitStorage(options);

  const check_to_set_cookie = (req, res) => {
    if (req.split.id === false && options.use_cookies === true) {
      if (req.cookies[options.cookie_name]) {
        req.split.id = parseInt(req.cookies[options.cookie_name].substring(0, 9), 10);
      } else {
        const uid = parseInt(uuid.v4().replace(/[^0-9]/g, '').substring(0, 9), 10);
        res.cookie(options.cookie_name, uid, { maxAge: options.cookie_max_age });
        req.split.id = uid;
      }
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
    for (let m in methods) {
      if (this[methods[m]] === undefined) {
        throw new TypeError(`The method ${methods[m]} must be overriden when deriving from SplitStorageAbstract`);
      }
    }
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
    for (let e in options.experiments) {
      this.results[e] = {};
      const ops = options.experiments[e].options;
      for (let o in ops) {
        this.results[e][ops[o]] = {
          impressions: 0,
          conversions: 0
        };
      }
    }
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

const seeded_rand = (seed) => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

module.exports = ExpressSplit;
