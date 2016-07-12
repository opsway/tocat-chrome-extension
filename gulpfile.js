var gulp = require('gulp');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var rename = require('gulp-rename');
var util = require('gulp-util');
var zip = require('gulp-zip');
var clean = require('gulp-clean');

gulp.task('concat-scripts', function() {
  return gulp.src([
    './js/jquery/jquery-1.12.4.js',
    './js/lodash/lodash-4.13.1.js',
    './js/bootstrap.js',
    './js/editableGrid/editablegrid.js',
    './js/editableGrid/editablegrid_charts.js',
    './js/editableGrid/editablegrid_editors.js',
    './js/editableGrid/editablegrid_renderers.js',
    './js/editableGrid/editablegrid_utils.js',
    './js/editableGrid/editablegrid_validators.js',
    './js/bootbox.js',
    './js/tools.js',
    './js/index.js'])
    .pipe(concat('assets.js'))
    .pipe(gulp.dest('./build/'));
});

gulp.task('concat-background-scripts', function() {
  return gulp.src([
    './js/tools.js',
    './js/background.js'
  ])
  .pipe(concat('background-assets.js'))
  .pipe(gulp.dest('./build/'));
});

gulp.task('concat-css', function() {
  return gulp.src([
    "./style/bootstrap.css",
    "./style/app.css",
    "./style/font-awesome.css",
    "./style/spinkit.css",
    "./style/style.css",
    "./style/simple-line-icons.css",
    "./js/editableGrid/editablegrid.css"])
    .pipe(concatCss('assets.css'))
    .pipe(gulp.dest('./build/'));
});

gulp.task('copy-key', function() {
  return gulp.src(util.env.keyPath ? util.env.keyPath : '../client/key.pem')
    .pipe(rename('key.pem'))
    .pipe(gulp.dest('.'));
});

gulp.task('rm-node_modules',['copy-key'], function() {
  return gulp.src('./node_modules')
  .pipe(clean({force: true}));
});

gulp.task('rm-temporary-key', ['zip'], function(){
  return gulp.src('./key.pem').
    pipe(clean({force: true}));
});

gulp.task('zip', ['rm-node_modules'], () => {
  return gulp.src('../tocat-chrome-extension/**/*.*')
    .pipe(zip('tocat-chrome-extension.zip'))
    .pipe(gulp.dest('../'));
});

gulp.task('compress', ['copy-key', 'rm-node_modules', 'zip', 'rm-temporary-key']);
gulp.task('default', ['concat-scripts', 'concat-css', 'concat-background-scripts']);
gulp.task('watch', function() {
  return gulp.watch(['js/**/*.js', 'style/**/*.css'], ['default']);
});
