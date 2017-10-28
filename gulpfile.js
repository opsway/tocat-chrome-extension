var gulp = require('gulp'),
  concat = require('gulp-concat'),
  concatCss = require('gulp-concat-css'),
  rename = require('gulp-rename'),
  util = require('gulp-util'),
  zip = require('gulp-zip'),
  clean = require('gulp-clean'),
  paths = {
    build: './build',
    node: './node_modules'
  };

gulp.task('move-content-scripts', function() {
  return gulp.src([
    './js/content/*.js'
  ])
    .pipe(gulp.dest(paths.build + '/js/content'));
});

gulp.task('move-content-styles', function() {
  return gulp.src([
    './style/content/*.css'
  ])
    .pipe(gulp.dest(paths.build + '/css/content'));
});

gulp.task('js-libs', function() {
  return gulp.src([
      paths.node + '/jquery/dist/jquery.min.js',
      paths.node + '/lodash/lodash.min.js',
      paths.node + '/bootstrap/dist/js/bootstrap.min.js',
      paths.node + '/bootbox/bootbox.min.js'])
    .pipe(concat('libs.js'))
    .pipe(gulp.dest(paths.build + '/js'));
});

gulp.task('concat-scripts', ['js-libs', 'move-content-scripts'], function() {
  return gulp.src([
    paths.build + '/js/libs.js',
    './js/editableGrid/editablegrid.js',
    './js/editableGrid/editablegrid_charts.js',
    './js/editableGrid/editablegrid_editors.js',
    './js/editableGrid/editablegrid_renderers.js',
    './js/editableGrid/editablegrid_utils.js',
    './js/editableGrid/editablegrid_validators.js',
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

gulp.task('concat-css', ['move-content-styles'], function() {
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
gulp.task('default', ['concat-scripts', 'concat-css', 'concat-background-scripts']);
gulp.task('watch', function() {
  return gulp.watch(['js/**/*.js', 'style/**/*.css'], ['default']);
});
