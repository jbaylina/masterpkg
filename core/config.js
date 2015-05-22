/*jslint node: true */
"use strict";

var nconf = require( 'nconf' );
var U = require('underscore');
var fs = require('fs');
var path = require('path');
var top = process.cwd();

nconf.env().argv();

// Read the defaults for all modules.
var defaults={};
fs.readdirSync(path.join(top, "master_modules")).forEach(function(module) {
	var filename = path.join(top, "master_modules", module, "master.json");
	if (fs.existsSync(filename)) {
		var modueJsonString = fs.readFileSync(filename);
		var moduleJson = JSON.parse(modueJsonString);
		if (typeof moduleJson.commonConfig === "object") {
			U.extend(defaults, moduleJson.commonConfig);
		}
		if (typeof moduleJson.serverConfig === "object") {
			U.extend(defaults, moduleJson.serverConfig);
		}
	}
});

if  (fs.existsSync(path.join(top, 'master.json'))) {
	var masterJsonString = fs.readFileSync(path.join(top, 'master.json'));
	var masterJson=JSON.parse(masterJsonString);
	if (typeof masterJson.commonConfig === "object") {
		U.extend(defaults,masterJson.commonConfig);
	}
	if (typeof masterJson.serverConfig === "object") {
		U.extend(defaults,masterJson.serverConfig);
	}

}

var masterConfigString = fs.readFileSync(path.join(top, 'config.json'));
var masterConfig = JSON.parse(masterConfigString);
if (typeof masterConfig.commonConfig === "object") {
	U.extend(defaults,masterConfig.commonConfig);
}
if (typeof masterConfig.serverConfig === "object") {
	U.extend(defaults,masterConfig.serverConfig);
}

nconf.defaults(defaults);

U.each(defaults, function(val, k) {
	exports[k] = nconf.get(k);
});

