"use strict";

const ExpressSplit = () => {
  return (req, res, next) => {
    req.split = {};
    next();
  }
};

module.exports = ExpressSplit;
