/*jslint node: true */

"use strict";

var gulp = require('gulp');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var connect = require('gulp-connect');
var sass   = require('node-sass');
var concat = require('gulp-concat');
var gettext = require('gulp-angular-gettext');
var shell = require('gulp-shell');
var modRewrite = require('connect-modrewrite');
var async = require('async');
var path = require('path');
var U = require('underscore');
var rimraf = require('rimraf');
var fs = require('fs');
var glob = require("glob");
var jade = require('jade');
var mkdirp = require('mkdirp');
var git = require('gulp-git');
var karmaServer = require('karma').Server;
var karmaParseConfig = require('karma/lib/config').parseConfig;
var mocha = require('gulp-mocha');

var browserify = require('browserify');

var config = require('./core/config.js');

var masterUtils = require('./masterUtils.js');

var watchFiles = {
	templates: [],
	indexes: [],
	statics: [],
	scripts: [],
	sass: []
};

var defaultKarma = {
	frameworks: ['mocha', 'chai','browserify'],
	basePath: './',
	browserify: {
		watch: true,
		debug: true
	},
	preprocessors: {
		'app.js': ['browserify']
	},
	reporters: ['mocha'],
	plugins: [
		'karma-mocha-reporter',
		'karma-firefox-launcher',
		'karma-mocha',
		'karma-chai',
		'karma-browserify',
		'karma-requirejs'
	]
};

gulp.task('sass', function(cb) {
	var buff = "";
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		glob(path.join(module.dir, 'client/**/*.scss') , {realpath:true }, function(err, files) {
			if (err) return cb(err);
			async.each(files, function(f, cb) {
				watchFiles.sass.push(f);
				sass.render({
					file: f
				}, function(err, result) {
					if (err) return cb(err);
					buff += result.css.toString();
					cb();
				});
			}, function(err) {
				if (err) return cb(err);
				writeFileD('./dist/app.css', buff, cb);
			});
		});
	}, cb);
});

gulp.task('reloadSass', ['sass'], function() {
	return connect.reload();
});

gulp.task('scripts', ['requiresModule', 'clientConfigModule'], function(cb) {
    // Single entry point to browserify
    var b = browserify();
    b.add(path.join('tmp', 'modules.js'),{
					insertGlobals : true,
          			debug : !config.gulpConfig.release
				});
	b.bundle(function(err, buff) {
		if (err) return cb(err);
		writeFileD('./dist/app.js', buff, cb);
	});
});

gulp.task('reloadScripts', ['scripts'], function() {
	return connect.reload();
});

gulp.task('masterLibs', function(cb) {

	if(!U.isEmpty(config.masterLibs)){

        var dir = __dirname + '/master_libs';
		var quiet = false;

        async.waterfall([
            function(callback) {
                /* CREACIO DEL DIRECTORI MASTER_LIBS */
                fs.access(dir, fs.R_OK | fs.W_OK, function (err) {
                    if(err){
                        if(err.code == 'ENOENT'){
                            fs.mkdir(dir, 484, function(err){
                                if (err) callback(err);
                                callback(null);
                            });
                        }else{
                            if (err) callback(err);
                        }
                    }else{
                        callback(null);
                    }
                });
            }
        ], function (err, result) {
            if (err) return cb(err);
            async.each(config.masterLibsreadline, function (module, cb) {
                var moduleDir = dir+'/'+module.name;
                async.waterfall([
                    function(callback) {
                        /* TINC ACCES AL DIRECTORI */
                        fs.access(moduleDir, fs.R_OK | fs.W_OK, function (err) {
                            if(err){
                                if(err.code == 'ENOENT'){
                                    /* NO TINC ACCES PK NO EXISTEIX */
                                    fs.mkdir(moduleDir, 484, function(err){
                                        if (err) return callback(err);
                                        /* CARPETA CREADA */
                                        callback(null);
                                    });
                                }else{
                                    /* NO HI TINC ACCESS */
                                    if (err) return callback(err);
                                }
                            }else{
                                /* YA EXISTEIX EL DIRECTORI */
                                callback(null);
                            }
                        });
                    },
                    function(callback) {
                        /* MIRO SI HI HAN ARXIUS */
                        fs.readdir(moduleDir, function(err, files) {
                            if (err) return callback(err);
                            if(!files.length) {
                                /* NO HI HAN ARXIUS, CLONO */
                                git.clone(module.git, {args: moduleDir, quiet: quiet}, function(err) {
                                    if (err) return callback(err);
                                    callback(null);
                                });
                            }else{
                                /* YA HI HAN ARXIUS */
                                callback(null);
                            }
                        });
                    },
                    function(callback) {
                        /* FER CHECKOUT */
						var options = {args: '--all', cwd: moduleDir, quiet: quiet};
                        git.fetch('', '', options, function (err) {
                            if (err) return callback(err);
							callback(null);
                        });
                    },
                    function(callback){
                        /* modifico el tag */
						var options = {cwd: moduleDir, quiet: quiet};
                        if(module.tag){
							git.checkout(module.tag, options, function (err) {
								if (err) callback(err);
								callback(null);
							});
                        }else{
							git.checkout('master', options, function (err) {
								if (err) callback(err);
								callback(null);
							});
						}
                    }
                ], function (err, result) {
                    if (err) return cb(err);
                    cb();
                });
            }, cb);
        });
	}else{
		return cb();
	}
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

gulp.task('templates', function(cb) {
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		glob(path.join(process.cwd(), module.dir, 'client/**/*.jade'), {realpath:true, ignore: path.join(process.cwd(), module.dir, 'client/static/**') }, function(err, files) {
			if (err) return cb(err);
			async.each(files, function(f, cb) {
				watchFiles.templates.push(f);
				fs.readFile(f, function(err, content) {
					if (err) return cb(err);
					try {
						var fn = jade.compile(content,{ pretty: !config.gulpConfig.release, filename: f});
						var output = fn(config.gulpConfig);
						var basename = path.basename(f,'.jade');
						var outName = path.join("dist", "templates", moduleName, basename + ".html");
						writeFileD(outName, output, cb);
					} catch(err) {
						cb(err);
					}
				});
			}, cb);
		});
	}, cb);
});

gulp.task('index', ['indexJade'], function(cb) {
	fs.readFile('./tmp/index.jade', function(err, content) {
		if (err) return cb(err);
		try {
			var fn = jade.compile(content,{ pretty: !config.gulpConfig.release, filename: path.join(process.cwd(), "tmp" , 'index.jade')});
			var output = fn(config.gulpConfig);
			writeFileD('./dist/index.html', output, cb);
		} catch(err) {
			cb(err);
		}
	});
});

gulp.task('reloadTemplates', ['templates', 'index'], function() {
	return connect.reload();
});

gulp.task('static', function(cb) {
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		glob(path.join(module.dir,'client','static', '**') ,
		 {realpath:true, nodir:true }, function(err, files) {
		 	if (err) return cb(err);
			async.each(files, function(f, cb) {
				watchFiles.statics.push(f);
				fs.readFile(f, function(err, content) {
					if (err) return cb(err);
					var relName = path.relative(path.join(module.dir, "client", "static"), f);
					var outName = path.join("dist", relName);
					writeFileD(outName, content, cb);
				});
			}, cb);
		});
	}, cb);
});

gulp.task('reloadStatic', ['static'], function() {
	return connect.reload();
});



gulp.task('pot', ['index','templates'], function() {
	return gulp.src(['./dist/app.js', './dist/index.html', './dist/templates/**/*.html'])
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
	runSequence(['npm', "scripts","templates","index","static", 'bower_components', 'sass', 'translations', 'app'], cb);
});

gulp.task('watch', [], function() {
	console.log(JSON.stringify(watchFiles, null,1));
	gulp.watch(watchFiles.templates, ['reloadTemplates']);
	gulp.watch(watchFiles.statics, ['reloadStatic']);
	gulp.watch(watchFiles.scripts, ['reloadScripts']);
	gulp.watch(watchFiles.sass, ['reloadSass']);
});

gulp.task('monitorServer', function () {
  connect.server({
    root: 'dist',
    port: 3001,
    livereload: true,
    fallback: "dist/index.html",
    middleware: function() {
      return [
        modRewrite([
          '^/api/(.*)$ http://localhost:3000/api/$1 [P]'
        ])
      ];
    }
  /*  ,
    middleware: function(connect, opt) {
      return [ historyApiFallback ];
    } */
  });
});

gulp.task('client', ['build'], function (cb) {
    runSequence('monitorServer', 'watch', cb);
});

gulp.task('bower', masterUtils.generateBowers);
gulp.task('npm', masterUtils.generateNpmPackages);
gulp.task('indexJade', ['bower'], masterUtils.generateIndexJade);

function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
        cb = mask;
        mask = '0777';
    }
    fs.mkdir(path, mask, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
            else cb(err); // something else went wrong
        } else cb(null); // successfully created folder
    });
}

var quoteString = function(S) {
		return '"'+S.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};


gulp.task('requiresModule', function(cb) {
	var output = "";
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		glob(path.join(process.cwd(), module.dir, 'client', '**', '*.js' ), {realpath:true, ignore: [path.join(process.cwd(), module.dir, 'client', 'static', '**' ), path.join(process.cwd(), module.dir, 'client', '**', '*.spec.js' )] }, function(err, files) {
			U.each(files, function(filename) {
				watchFiles.scripts.push(filename);
				output += "require(" + quoteString(filename) +");\n";
			});
			cb();
		});
	}, function(err) {
		if (err) return cb(err);
		ensureExists(path.join(process.cwd(), "tmp"), function(err2) {
			fs.writeFile(path.join(process.cwd(), "tmp", "modules.js"), output, cb);
		});
	});
});

gulp.task('clientConfigModule', masterUtils.generateClientConfigModule);

gulp.task('app', function() {
    return gulp.src([path.join(__dirname,  "app.js"), path.join(__dirname, "core" , "**")], {base: __dirname})
        .pipe(gulp.dest("."));
});

gulp.task('server', ['app', 'npm', 'build'], shell.task(["node app.js"]));

gulp.task('default', ['build'], function (cb) {
	runSequence('monitorServer', 'watch', cb);
});

gulp.task('test-client', function(cb) {
	defaultKarma.autoWatch = false;
	defaultKarma.singleRun = true;
	return runKarma('karma.conf.js', defaultKarma, cb);
});
gulp.task('test-client-dev', function(cb) {
	defaultKarma.autoWatch = true;
	defaultKarma.singleRun = false;
	return runKarma('karma.conf.js', defaultKarma, cb);
});
gulp.task('test-server', function() {
	return runMocha();
});
gulp.task('test', function(cb){
	runSequence(['test-server', 'test-client'], cb);
});
gulp.task('test-dev', function(cb){
	runSequence(['test-server', 'test-client-dev'], cb);
});

function runMocha(){
	return gulp.src(['**/common/*.spec.js', '**/server/*.spec.js'], {read: false})
		.pipe(mocha({
			reporter: 'spec'/*'nyan'*/
		}));
}

function runKarma(configFilePath, options, cb) {
	configFilePath = path.resolve(configFilePath);
	var noFile = false;
	async.series([
		function(callback){
			fs.stat(configFilePath, function(err, stats) {
				if (err){
					noFile = true;
				}
				callback();
			});
		},
		function(callback){
			if(noFile) {
				return callback();
			}
			/*
			 else{
			 	var config = {
			 		browsers: ['Firefox'],
			 		files: [
			 			"bower_components/** /*.js",
			 			'dist/app.js',
			 			'** /client/** /*.spec.js'
			 		]
			 	};
			 }
			 */
			var config = karmaParseConfig(configFilePath, {});

			Object.keys(options).forEach(function(key) {
				config[key] = options[key];
			});

			karmaServer = new karmaServer(config, karmaCompleted);
			karmaServer.start();

			function karmaCompleted(karmaResult) {
				if (karmaResult === 1) {
					return callback('karma: tests failed with code ' + karmaResult);
				} else {
					return callback();
				}
			}
		}
	], function(err, results){
		if(err){ return cb(err);}
		return cb();
	});
}
