var gulp = require('gulp');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var rename = require('gulp-rename');
var util = require('gulp-util');
var zip = require('gulp-zip');
var clean = require('gulp-clean');
var paths = {
  build: './build',
  node: './node_modules'
};

gulp.task('concat-scripts', function() {
  return gulp.src([
    paths.node + '/jquery/dist/jquery.min.js',
    paths.node + '/lodash/lodash.min.js',
    paths.node + '/bootstrap/dist/js/bootstrap.min.js',
    './js/editableGrid/editablegrid.js',
    './js/editableGrid/editablegrid_charts.js',
    './js/editableGrid/editablegrid_editors.js',
    './js/editableGrid/editablegrid_renderers.js',
    './js/editableGrid/editablegrid_utils.js',
    './js/editableGrid/editablegrid_validators.js',
    paths.node + '/bootbox/bootbox.min.js',
    './js/tools.js',
    './js/I.js',
    './js/Company.js',
    './js/index.js'])
    .pipe(concat('assets.js'))
    .pipe(gulp.dest(paths.build + '/js'));
});

gulp.task('concat-background-scripts', function() {
  return gulp.src([
    './js/tools.js',
    './js/background.js'
  ])
  .pipe(concat('background-assets.js'))
  .pipe(gulp.dest(paths.build + '/js'));
});

gulp.task('concat-content-scripts', function() {
  return gulp.src([
    './js/tools.js',
    './js/content.js'
  ])
  .pipe(concat('content-assets.js'))
  .pipe(gulp.dest(paths.build + '/js'));
});

gulp.task('concat-css', function() {
  return gulp.src([
    paths.node + '/bootstrap/dist/css/bootstrap.css',
    "./style/app.css",
    "./style/font-awesome.css",
    "./style/spinkit.css",
    "./style/style.css",
    "./style/simple-line-icons.css",
    "./js/editableGrid/editablegrid.css"])
    .pipe(concatCss('assets.css'))
    .pipe(gulp.dest(paths.build + '/css'));
});

gulp.task('copy-key', function() {
  return gulp.src(util.env.keyPath ? util.env.keyPath : '../client/key.pem')
    .pipe(rename('key.pem'))
    .pipe(gulp.dest('.'));
});

gulp.task('rm-temporary-key', ['zip'], function(){
  return gulp.src('./key.pem').
    pipe(clean({force: true}));
});

gulp.task('zip', ['copy-key'], function (){
  return gulp.src('../tocat-chrome-extension/**/*.*')
    .pipe(zip('tocat-chrome-extension.zip'))
    .pipe(gulp.dest('../'));
});

gulp.task('compress', ['copy-key', 'zip', 'rm-temporary-key']);
gulp.task('default', ['concat-scripts', 'concat-css', 'concat-background-scripts', 'concat-content-scripts']);
gulp.task('watch', function() {
  return gulp.watch(['js/**/*.js', 'style/**/*.css'], ['default']);
});
