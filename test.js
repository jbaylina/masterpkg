/*jslint node: true */
"use strict";

var masterUtils = require('./masterUtils.js');

console.log(masterUtils);

/*
masterUtils.generateBowers(function(err) {
	if (err) {
		console.log(err.stack);
	} else {
		console.log("done");
	}
	process.exit(0);
});
*/
/*
masterUtils.runBower(function(err) {
	if (err) {
		console.log(err.stack);
	} else {
		console.log("done");
	}
	process.exit(0);
});
*/

/*
masterUtils.generateIndexJade(function(err) {
	if (err) {
		console.log(err.stack);
	} else {
		console.log("done");
	}
	process.exit(0);
});
*/

/*
masterUtils.generateModules(function(err) {
	if (err) {
		console.log(err.stack);
	} else {
		console.log("done");
	}
	process.exit(0);
});
*/

/*
masterUtils.generateClientConfigModule(function(err) {
	if (err) {
		console.log(err.stack);
	} else {
		console.log("done");
	}
	process.exit(0);
});
*/

masterUtils.generateNpmPackages(function(err) {
	if (err) {
		console.log(err.stack);
	} else {
		console.log("done");
	}
	process.exit(0);
});
