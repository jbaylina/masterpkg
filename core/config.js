/*jslint node: true */
/* global __mods */
"use strict";

var nconf = require( 'nconf' );
var U = require('underscore');
var fs = require('fs');
var path = require('path');
var top = process.cwd();

nconf.env().argv();

// Read the defaults for all modules.
var defaults={
	masterLibs: {},
	masterModules: {},
	clientConfig: {},
	gulpConfig: {}
};

var buff;
var masterJson = {};
var configJson = {};

if  (fs.existsSync(path.join(top, 'master.json'))) {
	buff = fs.readFileSync(path.join(top, 'master.json'));
	masterJson=JSON.parse(buff);
}

if  (fs.existsSync(path.join(top, 'config.json'))) {
	buff = fs.readFileSync(path.join(top, 'config.json'));
	configJson = JSON.parse(buff);
}

if (typeof masterJson.masterLibs === "object") {
	U.extend(defaults.masterLibs,masterJson.masterLibs);
}

if (typeof configJson.masterLibs === "object") {
	U.extend(defaults.masterLibs,configJson.masterLibs);
}
U.each(defaults.masterLibs, function (module, moduleName) {
	defaults.masterLibs[moduleName] = defaults.masterLibs[moduleName];
	defaults.masterLibs[moduleName].name = moduleName;
	module = defaults.masterLibs[moduleName];
});

if (typeof masterJson.masterModules === "object") {
	U.extend(defaults.masterModules,masterJson.masterModules);
}

if (typeof configJson.masterModules === "object") {
	U.extend(defaults.masterModules,configJson.masterModules);
}

U.each(defaults.masterModules, function (module, moduleName) {
	if (typeof defaults.masterModules[moduleName] === "string") {
		defaults.masterModules[moduleName] = {
			dir: defaults.masterModules[moduleName]
		};
	}
	defaults.masterModules[moduleName].name = moduleName;
	module = defaults.masterModules[moduleName];
	var filename = path.join(module.dir, "master.json");
	if (fs.existsSync(filename)) {
		buff = fs.readFileSync(filename);
		var moduleJson = JSON.parse(buff);
		if (typeof moduleJson.commonConfig === "object") {
			U.extend(defaults, moduleJson.commonConfig);
		}
		if (typeof moduleJson.serverConfig === "object") {
			U.extend(defaults, moduleJson.serverConfig);
		}
		if (typeof moduleJson.commonConfig === "object") {
			U.extend(defaults.clientConfig, moduleJson.commonConfig);
		}
		if (typeof moduleJson.clientConfig === "object") {
			U.extend(defaults.clientConfig, moduleJson.clientConfig);
		}
		if (typeof moduleJson.gulpConfig === "object") {
			U.extend(defaults.gulpConfig, moduleJson.gulpConfig);
		}
	}
});

if (typeof masterJson.commonConfig === "object") {
	U.extend(defaults,masterJson.commonConfig);
}
if (typeof masterJson.serverConfig === "object") {
	U.extend(defaults,masterJson.serverConfig);
}
if (typeof masterJson.commonConfig === "object") {
	U.extend(defaults.clientConfig,masterJson.commonConfig);
}
if (typeof masterJson.clientConfig === "object") {
	U.extend(defaults.clientConfig,masterJson.clientConfig);
}
if (typeof masterJson.gulpConfig === "object") {
	U.extend(defaults.gulpConfig, masterJson.gulpConfig);
}


if (typeof configJson.commonConfig === "object") {
	U.extend(defaults,configJson.commonConfig);
}
if (typeof configJson.serverConfig === "object") {
	U.extend(defaults,configJson.serverConfig);
}
if (typeof configJson.commonConfig === "object") {
	U.extend(defaults.clientConfig,configJson.commonConfig);
}
if (typeof configJson.clientConfig === "object") {
	U.extend(defaults.clientConfig,configJson.clientConfig);
}
if (typeof configJson.gulpConfig === "object") {
	U.extend(defaults.gulpConfig, configJson.gulpConfig);
}

U.extend(defaults.gulpConfig, defaults.clientConfig);

nconf.defaults(defaults);

U.each(defaults, function(val, k) {
	exports[k] = nconf.get(k);
});

