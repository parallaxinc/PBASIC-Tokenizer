'use strict';

module.exports = {
  entry: './tokenizer.js',
  output: {
    path: __dirname,
    filename: 'index.js',
    library: 'PBASIC',
    libraryTarget: 'umd'
  },
  target: 'node'
};
