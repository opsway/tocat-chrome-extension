var gulp = require('gulp');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');

gulp.task('concat-scripts', function() {
  return gulp.src([
    './js/jquery/jquery-1.12.4.js',
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

gulp.task('default', ['concat-scripts', 'concat-css']);