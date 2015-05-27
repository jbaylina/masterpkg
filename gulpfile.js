/*jslint node: true */
/* global __mods */
/* global __top */
"use strict";

var gulp = require('gulp');
var gjade = require('gulp-jade');
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
var glob = require("glob");
var jade = require('jade');
var mkdirp = require('mkdirp');



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

function writeFileD(filename, data, options, cb) {
	if (typeof options === "function") {
		cb = options;
		options = {};
	}
	mkdirp(path.dirname(filename), options, function(err) {
		if (err) return cb(err);
		fs.writeFile(filename, data, options, cb);
	});
}

gulp.task('templates', ['gulpConfig'], function(cb) {
	async.each(modules, function(module, cb) {
		glob('master_modules/'+module+'/client/**/*.jade' , {cwd: __top, realpath:true }, function(err, files) {
			if (err) return cb(err);
			async.each(files, function(f, cb) {
				fs.readFile(f, function(err, content) {
					if (err) return cb(err);
					try {
						var fn = jade.compile(content,{ pretty: !gulpConfig.release, filename: f});
						var output = fn(gulpConfig);
						var relName = path.relative(path.join("master_modules", module, "client"), f);
						relName = relName.substr(0, relName.lastIndexOf('.')) + ".html";
						var outName = path.join("dist", "templates", module, relName);
						writeFileD(outName, output, cb);
					} catch(err) {
						cb(err);
					}
				});
			}, cb);
		});
	}, cb);
});

gulp.task('index', ['indexJade', 'gulpConfig'], function(cb) {

	fs.readFile('./tmp/index.jade', function(err, content) {
		if (err) return cb(err);
		try {
			var fn = jade.compile(content,{ pretty: !gulpConfig.release, filename: path.join(__top, "tmp" , 'index.jade')});
			var output = fn(gulpConfig);
			writeFileD('./dist/index.html', output, cb);
		} catch(err) {
			cb(err);
		}
	});
});

gulp.task('static', function(cb) {
	async.each(modules, function(module, cb) {
		glob(path.join('master_modules',module,'client','static', '**') ,
		 {cwd: __top, realpath:true, nodir:true }, function(err, files) {
		 	if (err) return cb(err);
			async.each(files, function(f, cb) {
				fs.readFile(f, function(err, content) {
					if (err) return cb(err);
					var relName = path.relative(path.join("master_modules", module, "client", "static"), f);
					var outName = path.join("dist", relName);
					writeFileD(outName, content, cb);
				});
			}, cb);
		});
	}, cb);
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

