var gulp = require('gulp'),
  concat = require('gulp-concat'),
  concatCss = require('gulp-concat-css'),
  rename = require('gulp-rename'),
  util = require('gulp-util'),
  zip = require('gulp-zip'),
  clean = require('gulp-clean'),
  paths = {
    build: './build',
    node: './node_modules',
    scripts: './js',
    styles: './style'
  };

gulp.task('move-content-scripts', function() {
  return gulp.src([
    paths.scripts + '/content/*.js'
  ])
    .pipe(gulp.dest(paths.build + '/js/content'));
});

gulp.task('zoho-content-scripts-libs', function() {
  return gulp.src([
    paths.node + '/tingle.js/dist/tingle.min.js'
  ])
    .pipe(concat('people-zoho-libs.js'))
    .pipe(gulp.dest(paths.build + '/js/content'));
});

gulp.task('zoho-content-styles', function() {
  return gulp.src([
    paths.node + '/tingle.js/dist/tingle.min.css',
    paths.styles + '/content/people-zoho.css'
  ])
    .pipe(concat('people-zoho.css'))
    .pipe(gulp.dest(paths.build + '/css/content'));
});

gulp.task('tools-js', function() {
  return gulp.src(paths.scripts + '/tools.js')
    .pipe(concat('tools.js'))
    .pipe(gulp.dest(paths.build + '/js'));
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

gulp.task('concat-scripts', ['zoho-content-scripts-libs', 'js-libs', 'tools-js', 'move-content-scripts'], function() {
  return gulp.src([
    paths.build + '/js/libs.js',
    paths.scripts + '/editableGrid/editablegrid.js',
    paths.scripts + '/editableGrid/editablegrid_charts.js',
    paths.scripts + '/editableGrid/editablegrid_editors.js',
    paths.scripts + '/editableGrid/editablegrid_renderers.js',
    paths.scripts + '/editableGrid/editablegrid_utils.js',
    paths.scripts + '/editableGrid/editablegrid_validators.js',
    paths.scripts + '/tools.js',
    paths.scripts + '/I.js',
    paths.scripts + '/Company.js',
    paths.scripts + '/popup.js'])
    .pipe(concat('popup.js'))
    .pipe(gulp.dest(paths.build + '/js'));
});

gulp.task('concat-background-scripts', function() {
  return gulp.src([
    paths.scripts + '/tools.js',
    paths.scripts + '/background.js'
  ])
  .pipe(concat('background.js'))
  .pipe(gulp.dest(paths.build + '/js'));
});

gulp.task('concat-css', ['zoho-content-styles'], function() {
  return gulp.src([
    paths.node + '/bootstrap/dist/css/bootstrap.css',
    paths.styles + '/app.css',
    paths.styles + '/font-awesome.css',
    paths.styles + '/spinkit.css',
    paths.styles + '/style.css',
    paths.styles + '/simple-line-icons.css',
    paths.scripts + '/editableGrid/editablegrid.css'])
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
