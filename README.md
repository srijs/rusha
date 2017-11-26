# Rusha [![Build Status](https://travis-ci.org/srijs/rusha.svg?branch=master)](https://travis-ci.org/srijs/rusha)
*A high-performance pure-javascript SHA1 implementation suitable for large binary data.*

[![NPM](https://nodei.co/npm/rusha.png?downloads=true&downloadRank=true)](https://nodei.co/npm/rusha/)

## Installing

### NPM

Rusha is available va [npm](http://npmjs.org/):

```
npm install rusha
```

### Bower

Rusha is available via [bower](http://twitter.github.com/bower/):

```
bower install rusha
```

## Usage

It is highly recommended to run CPU-intensive tasks in a [Web Worker](http://developer.mozilla.org/en-US/docs/DOM/Using_web_workers). To do so, just follow the instructions on _Using the Rusha Worker_.

If you can't, for any reason, use Web Workers, include the `dist/rusha.js` file in a `<script>` tag and follow the instructions on _Using the Rusha Object_.

### Using the Rusha Worker

#### Spawning workers

You can create a new worker in two ways. The preferred way is using `Rusha.createWorker()`, which spawns a webworker containing the hashing logic, and returns back a `Worker` object:

```js
var worker = Rusha.createWorker();
```

If for some reason this does not work for you, you can also just point the `Worker` constructor
at `rusha.js` or `rusha.min.js`, like so:

```js
var worker = new Worker("dist/rusha.min.js");
```

**Note**: In order to make the latter work, Rusha will by default subscribe to incoming messages
when it finds itself inside a worker context. This can lead to problems when you would like to use Rusha as a library inside a web worker, but still have control over the messaging. To disable this behaviour, you can call `Rusha.disableWorkerBehaviour()` from within the worker.

#### Using the worker

You can send your instance of the web worker messages in the format `{id: jobid, data: dataobject}`. The worker then sends back a message in the format `{id: jobid, hash: hash}`, were jobid is the id of the job previously received and hash is the hash of the data-object you passed, be it a `Blob`, `Array`, `Buffer`, `ArrayBuffer` or `String`

### Using the Rusha Object

#### Examples

##### Normal usage

```js
var rusha = new Rusha();
var hexHash = rusha.digest('I am Rusha'); 
```

##### Incremental usage

```js
var rusha = new Rusha();
rusha.resetState();
rusha.append('I am');
rusha.append(' Rusha');
var hexHash = rusha.end();
```

#### Reference

Your instantiate a new Rusha object by doing `var r = new Rusha(optionalSizeHint)`. When created, it provides the following methods:

- `Rusha#digest(d)`: Create a hex digest from data of the three kinds mentioned below, or throw and error if the type is unsupported.
- `Rusha#digestFromString(s)`: Create a hex digest from a binary `String`. A binary string is expected to only contain characters whose charCode < 256.
- `Rusha#digestFromBuffer(b)`: Create a hex digest from a `Buffer` or `Array`. Both are expected to only contain elements < 256.
- `Rusha#digestFromArrayBuffer(a)`: Create a hex digest from an `ArrayBuffer` object.
- `Rusha#rawDigest(d)`: Behaves just like #digest(d), except that it returns the digest as an Int32Array of size 5.
- `Rusha#resetState()`: Resets the internal state of the computation.
- `Rusha#append(d)`: Appends a binary `String`, `Buffer`, `Array`, `ArrayBuffer` or `Blob`.
- `Rusha#setState(state)`: Sets the internal computation state. See: getState().
- `Rusha#getState()`: Returns an object representing the internal computation state. You can pass this state to setState(). This feature is useful to resume an incremental sha.
- `Rusha#end()`: Finishes the computation of the sha, returning a hex digest.
- `Rusha#rawEnd()`: Behaves just like #end(), except that it returns the digest as an Int32Array of size 5.

## Development

* Download npm dependencies with `npm install`
* Make changes to the files in `src/`
* Build with `npm run build`
* Run tests with `npm test`

## Benchmarks

Tested were my Rusha implementation, the sha1.js implementation by [P. A. Johnston](http://pajhome.org.uk/crypt/md5/sha1.html), Tim Caswell's [Cifre](http://github.com/openpeer/cifre) and the Node.JS native implementation.

If you want to check the performance for yourself in your own browser, I compiled a [JSPerf Page](http://jsperf.com/rusha/13).

A normalized estimation based on the best results for each implementation, smaller is better:
![rough performance graph](http://srijs.github.io/rusha/bench/unscientific01.png)

Results per Implementation and Platform:
![performance chart](https://docs.google.com/spreadsheet/oimg?key=0Ag9CYh5kHpegdDB1ZG16WU1xVFgxdjRuQUVwQXRnWVE&oid=1&zx=pcatr2aits9)

All tests were performed on a MacBook Air 1.7 GHz Intel Core i5 and 4 GB 1333 MHz DDR3.
