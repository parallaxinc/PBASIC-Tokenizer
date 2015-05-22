'use strict';

const tar = require('tar-fs');
const gulp = require('gulp');
const gunzip = require('gunzip-maybe');
const request = require('request');

const SDK_URL = 'https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz';

function fetch(){
  return request.get(SDK_URL)
    .pipe(gunzip())
    .pipe(tar.extract('./'));
}

gulp.task(fetch);
