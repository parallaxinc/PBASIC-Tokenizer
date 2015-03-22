'use strict';

module.exports = {
  entry: './tokenizer.js',
  output: {
    path: __dirname,
    filename: 'browser.js',
    library: 'PBASIC',
    libraryTarget: 'umd'
  },
  node: {
    fs: 'empty',
    process: false
  }
};
