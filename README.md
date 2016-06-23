# express-split
Express middleware for split and AB testing. Allows to run multiple experiments and track conversions to choose the winning variant.

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

## Cookies
Call a cookie middleware like [cookie-parser](https://github.com/expressjs/cookie-parser) before using express-split:
```
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
| db_table_experiments  | Where to store the experiments in the database                           | `'splt_experiments'`     |
| db_table_users        | Where to store the users in the database                                 | `'splt_users'`           |
| use_cookies           | Whether or not to use cookies. If false, use `req.split.set_id()` to manually set an identifier for each user | `false`      |
| cookie_name           | The cookie name to use                                                   | `'_spltuid'`             |
| cookie_max_age        | The max-age to set for the cookie                                        | `15552000000` (180 days) |

#### experiments

The `experiments` object holds the experiment name in each key, with the value of a new object `options` that holds an array of the variants for this experiment. As a convention, the first option should be the default option (if anything fails, the first option will be returned).
```
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
