# express-split
Express middleware for split and AB testing. Allows to run multiple experiments and track conversions to choose the winning variant.

## Usage
Add express-split to your project
```shell
npm install express-split
```
Import express-split
```javascript
const split = require('express-split');
```
Add your experiments
```javascript
app.use(split({
  experiments: {
   'button-text': {options: ['sign-up', 'start', 'early-access']}
}}));
```
Start an experiment for a user (a random option will be assigned)
```javascript
app.get('/', (req, res) => {
  req.split.start('button-text', () => {
    res.send('Home page');
  });
});
```
Do different things for each variant
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
Mark convertions
```javascript
app.post('/subscribe', (req, res) => {
  req.split.finish('button-text', () => {
    res.send('Thanks!');
  });
});
```
Get the results for each experiment
```javascript
app.get('/admin/experiments', (req, res) => {
  req.split.results((results) => {
    res.send(JSON.stringify(results, null, 4));
  });
});
```

## Options

## Cookies

## Storage
