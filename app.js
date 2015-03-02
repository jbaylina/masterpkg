/*jslint node: true */
/* global __mods */
/* global __top */
'use strict';

var path = require('path');
var fs = require('fs');
global.__top = process.cwd();
global.__mods = {};

// Load all mods
fs.readdirSync(path.join(__top, "master_modules")).forEach(function(module) {
	var filename = path.join(__top, "master_modules", module, "server", "index.js");
    if (fs.existsSync(filename)) {
		__mods[module] = require(filename);
	}
});

// Init all mods
for (var m in __mods) {
	if (  (__mods.hasOwnProperty(m))&&
		(typeof __mods[m] === "object")&&
		(typeof __mods[m].init === "function"))
	{
		__mods[m].init();
	}
}
