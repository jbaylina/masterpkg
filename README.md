# MasterPKG

MasterPKG is a full-stack JavaScript open-source solution, which provides a solid starting point for [Syncorm](https://github.com/jbaylina/syncorm), [Node.js](https://nodejs.org/en/), [Express](http://expressjs.com/), [AngularJS](https://github.com/jbaylina/masterpkg_base) and [masterpkg base](https://github.com/jbaylina/masterpkg_base) based applications. 
The idea is build a robust framework to support development needs, and help developers while working with JavaScript.


### Before you begin

Before you begin we recommend you read about the basic building blocks that assemble a MasterPKG application:

* Syncorm: Syncorm [github project](https://github.com/jbaylina/syncorm). The main idea of this orm is to load the full database in memory at the begining of the execution.
* Master Base: [masterpkg base](https://github.com/jbaylina/masterpkg_base)
* Express - The best way to understand express is through its [Official Website](http://expressjs.com/), which has a [Getting Started](http://expressjs.com/starter/installing.html) guide, as well as an [ExpressJS](http://expressjs.com/en/guide/routing.html) guide for general express topics. You can also go through this [StackOverflow Thread](http://stackoverflow.com/questions/8144214/learning-express-for-node-js) for more resources.
* AngularJS - Angular's [Official Website](http://angularjs.org/) is a great starting point. You can also use [Thinkster Popular Guide](http://www.thinkster.io/), and [Egghead Videos](https://egghead.io/).
* Node.js - Start by going through [Node.js Official Website](http://nodejs.org/) and this [StackOverflow Thread](http://stackoverflow.com/questions/2353818/how-do-i-get-started-with-node-js), which should get you going with the Node.js platform in no time.

### Prerequisites
- Git - https://git-scm.com/
- nodejs - https://nodejs.org

### Install:
Only need execute
```sh
$ npm install masterpkg -g
```


### Running your application
Server is similar than "Build task" but initializing the server node js
```sh
masterpkg server
```
Then you can access to http://localhost:3000


### Running with watchers on frontend
The task client, initializes the "watches" of the files frontend (this task requires that the server is running)
```sh
masterpkg client
```
Then you can access to http://localhost:3001


### Server build
```sh
masterpkg build
```
npm install script executes the following commands in the following order:
- npm: 
- scripts: 
- templates: 
- index: 
- static: 
- bower_components: 
- sass: 
- translations: 
- app: 





### Test
Para ejecutar los test
```sh
masterpkg test
```
Need a karma config file


### Test development
To run the test in debug mode
```sh
masterpkg test-dev
```
Need a karma config file


### Master libs
To install the libraries of [masterpkg base](https://github.com/jbaylina/masterpkg_base)
```sh
masterpkg masterLibs
```


### Translate
To check all files where there are translations and create files * .po
```sh
masterpkg pot
```