# express-split
Node.js Express middleware for split and AB testing. Allows to run multiple experiments and track conversions to choose the winning variant.

## Usage
Add express-split to your project:
```shell
npm install express-split
```

Import express-split:
```javascript
const split = require('express-split');
```

Add your experiments:
```javascript
app.use(split({
  experiments: {
   'button-text': {options: ['sign-up', 'start', 'early-access']}
}}));
```

Start an experiment for a user (a random option will be assigned):
```javascript
app.get('/', (req, res) => {
  req.split.set_id(1234); // Sets an indentifier for this user - can be avoided if using cookies
  req.split.start('button-text', () => {
    res.send('Home page');
  });
});
```

Do different things for each variant:
```javascript
app.get('/product', (req, res) => {
  req.split.get('button-text', (option) => {
    if (option === 'start') {
      res.send('Start now!');
    } else if (option === 'start') {
      res.send('Get early access');
    } else {
      res.send('Sign up');
    }
  });
});
```

Mark convertions:
```javascript
app.post('/subscribe', (req, res) => {
  req.split.finish('button-text', () => {
    res.send('Thanks!');
  });
});
```

Get the results for each experiment:
```javascript
app.get('/admin/experiments', (req, res) => {
  req.split.results((results) => {
    res.send(JSON.stringify(results, null, 4));
  });
});
```

Get the results in a web GUI:
```javascript
app.get('/admin/experiments', (req, res) => {
  req.split.gui(req, res);
});
```

## Cookies
**Note:** If you don't use cookies you have to manually specify an integer identification for the user.

Call a cookie middleware like [cookie-parser](https://github.com/expressjs/cookie-parser) before using express-split:
```javascript
const cookieParser = require('cookie-parser');
const split        = require('express-split');

app.use(cookieParser());
app.use(split({use_cookies: true}));
```

## Options
| Option                | Description    | Default                                                                            |
| ----------------------|----------------|------------------------------------------------------------------------------------|
| experiments           | The available experiments and their options (see format below)           | `{}`                     |
| storage               | Where to store the experiments results (Options: `in-memory`, `mysql`)   | `'in-memory'`            |
| db_pool               | Connection pool object. Required if chosen a database storage            | `false`                  |
| db_table_experiments  | Where to store the experiments in the database                           | `'split_experiments'`    |
| db_table_users        | Where to store the users in the database                                 | `'split_users'`          |
| use_cookies           | Whether or not to use cookies. If false, use `req.split.set_id()` to manually set an identifier for each user | `false` |
| cookie_name           | The cookie name to use                                                   | `'_splituid'`            |
| cookie_max_age        | The max-age to set for the cookie                                        | `15552000000` (180 days) |

#### experiments

The `experiments` object holds the experiment name in each key, with the value of a new object `options` that holds an array of the variants for this experiment. As a convention, the first option should be the default option (if anything fails, the first option will be returned).
```javascript
{
  'button-text': {
    options: ['sign-up', 'start', 'early-access']
  },
  'price': {
    options: ['300', '200', '400']
  }
}
```

## Storage
#### in-memory (default)
**Note:** Using this option, your data will be deleted once the node process is stopped.

Stores the experiments and users data in the node process memory. Useful for setting up, not recommended in production.

#### mysql
Persists the data to a MySQL database.
Creates 2 tables: `split_experiments` and `split_users` (configurable).
A required `db_pool` object must be provided.

```javascript
const app   = express();
const split = require('express-split');
const mysql = require('mysql');
const pool  = mysql.createPool({
  connectionLimit : 30,
  host     : 'localhost',
  user     : 'db_username',
  password : 'secret_password',
  database : 'db_name'
});

app.use(split({
  storage: 'mysql',
  db_pool: pool,
  experiments: {
    'price': {
      options: ['300', '200', '400']
    }
  }
}));
```

## API
#### Constructor
#### set_id(user_id)
#### start(experiment_id, [callback])
#### get(experiment_id, callback)
#### finish(experiment_id, [callback])
#### results(callback)
