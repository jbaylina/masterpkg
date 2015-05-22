/*jslint node: true */
/* global __mods */
/* global __top */
"use strict";

var gulp = require('gulp');
var jade = require('gulp-jade');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var browserify = require('gulp-browserify');
var connect = require('gulp-connect');
var sass   = require('gulp-sass');
var concat = require('gulp-concat');
var gettext = require('gulp-angular-gettext');
var shell = require('gulp-shell');
var historyApiFallback = require('connect-history-api-fallback');
var async = require('async');
var path = require('path');
var U = require('underscore');
var rimraf = require('rimraf');
var fs = require('fs');



global.__top = process.cwd();
global.__mods = {};

var masterConfigString = fs.readFileSync(path.join(__top, 'config.json'));
var masterConfig = JSON.parse(masterConfigString);
var modules = global.__mods.masterModules = masterConfig.masterModules;

var masterUtils = require('./masterUtils.js');

var gulpConfig;

var config = {
	srcTemplates: './master_modules/*/client/**/*.jade',
	srcIndex: './tmp/index.jade',
	srcStatic: ['./master_modules/*/client/static/*', './master_modules/*/client/static/*/**'],
	srcScript: './tmp/modules.js',
	srcScripts: './master_modules/**/*.js',
	srcSass: './master_modules/**/*.sass',
	srcPackages: ['./master_modules/*/master.json', './master.json'],
	srcTranslations: ['./dist/app.js', './dist/index.html', './dist/templates/**/*.html']
};

gulp.task('gulpConfig', function(cb) {
    masterUtils.getClientConfig(function(err, cc) {
        if (err) return cb(err);
        gulpConfig = cc;
        gulpConfig.release = !!global.release;
        cb();
    });
});

gulp.task('sass', function () {
    return gulp.src(config.srcSass)
        .pipe(sass())
        .pipe(concat('app.css'))
        .pipe(gulp.dest('./dist/'))
        .pipe(connect.reload());
});

gulp.task('scripts', ['requiresModule', 'clientConfigModule', 'gulpConfig'], function() {
    // Single entry point to browserify
    return gulp.src(config.srcScript)
        .pipe(browserify({
          insertGlobals : true,
          debug : !gulpConfig.release
        }))
        .pipe(rename('app.js'))
        .pipe(gulp.dest('./dist/'))
        .pipe(connect.reload());
});

function getTopPath(p) {
	var parent= path.dirname(p);
	if ( parent !== ".") {
		return getTopPath(parent);
	} else {
		return p;
	}
}

gulp.task('templates', ['gulpConfig'], function() {
	return gulp.src(config.srcTemplates, {base: "./"})
		.pipe(jade({
			locals: gulpConfig,
			pretty: !gulpConfig.release
		}))
		.pipe(rename(function(p) {
			var a = path.relative("./master_modules", p.dirname);
			var module = getTopPath(a);
			var b = path.relative(path.join("master_modules", module, "client"), p.dirname);
			var c = path.join("/", module, b);
			p.dirname = c;
		}))
		.pipe(gulp.dest('./dist/templates/'))
		.pipe(connect.reload());
});

gulp.task('index', ['indexJade', 'gulpConfig'], function() {
	return gulp.src(config.srcIndex)
		.pipe(jade({
			locals: gulpConfig,
			pretty: !gulpConfig.release
		}))
		.pipe(gulp.dest('./dist/'))
		.pipe(connect.reload());
});

gulp.task('static', function() {
	return gulp.src(config.srcStatic, {base: "./"})
		.pipe(rename(function(p) {
			var a = path.relative("./master_modules", p.dirname);
			var module = getTopPath(a);
			var b = path.relative(path.join("master_modules", module, "client", "static"), p.dirname);
			var c = path.join("/", b);
			p.dirname = c;
		}))
		.pipe(gulp.dest('./dist/'))
		.pipe(connect.reload());
});



gulp.task('pot', ['index','templates'], function() {
	return gulp.src(config.srcTranslations)
        .pipe(gettext.extract('./translations/template.pot', {
            // options to pass to angular-gettext-tools...
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('translations', function () {
    return gulp.src('translations/*.po')
        .pipe(gettext.compile({
            // options to pass to angular-gettext-tools...
            format: 'json'
        }))
        .pipe(gulp.dest('dist/translations/'));
});

gulp.task('bower_components', ['bower'], function() {
	return gulp.src(['./bower_components/**'])
		.pipe(gulp.dest('./dist/bower_components'))
		.pipe(connect.reload());
});


gulp.task('clean', function (cb) {
    rimraf('./dist', function() {
        rimraf('./tmp',cb);
    });
});

gulp.task('build', ['clean'], function (cb) {
	runSequence(["scripts","templates","index","static", 'bower_components', 'sass', 'translations', 'app'], cb);
});

gulp.task('watch', function() {
	gulp.watch(config.srcTemplates, ['templates', 'index']);
	gulp.watch(config.srcPackages, ['index']);
	gulp.watch(config.srcStatic, ['static']);
	gulp.watch(config.srcScripts, ['scripts']);
	gulp.watch(config.srcSass, ['sass']);
});

gulp.task('monitorServer', function () {
  connect.server({
    root: './dist',
    port: 3001,
    livereload: true,
    middleware: function(connect, opt) {
      return [ historyApiFallback ];
    }
  });
});

gulp.task('client', ['build'], function (cb) {
    runSequence('monitorServer', 'watch', cb);
});

gulp.task('bower', masterUtils.generateBowers);
gulp.task('npm', masterUtils.generateNpmPackages);
gulp.task('indexJade', ['bower'], masterUtils.generateIndexJade);
gulp.task('requiresModule', masterUtils.generateRequiresModule);
gulp.task('clientConfigModule', masterUtils.generateClientConfigModule);

gulp.task('app', function() {
    return gulp.src([path.join(__dirname,  "app.js"), path.join(__dirname, "core" , "**")], {base: __dirname})
        .pipe(gulp.dest("."));
});

gulp.task('server', ['app', 'npm', 'build'], shell.task(["node app.js"]));

gulp.task('default', ['build'], function (cb) {
	runSequence('monitorServer', 'watch', cb);
});

