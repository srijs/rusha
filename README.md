# Rusha
*A high-performance pure-javascript SHA1 implementation suitable for large binary data.*

## Prologue: The Sad State of Javascript SHA1 implementations

When we started experimenting with alternative upload technologies at [doctape](http://doctape.com) that required creating SHA1 hashes of the data locally on the client, it quickly became obvious that there were no performant pure-js implementations of SHA1 that worked correctly on binary data.

Jeff Mott's [CryptoJS](http://code.google.com/p/crypto-js/) and Brian Turek's [jsSHA](http://caligatio.github.com/jsSHA/) were both hash functions that worked correctly on ASCII strings of a small size, but didn't scale to large data and/or didn't work correctly with binary data.

(On a sidenode, as of now Tim Caswell's [Cifre](http://github.com/openpeer/cifre) actually works with large binary data, as opposed to previously statet.)

By modifying Paul Johnston's [sha1.js](http://pajhome.org.uk/crypt/md5/sha1.html) slightly, it worked correctly on binary data but was unfortunately very slow, especially on V8. So a few days were invested on my side to implement a Johnston-inspired SHA1 hashing function with a heavy focus on performance.

The result of this process is Rusha, a SHA1 hash function that works flawlessly on large amounts binary data, such as binary strings or ArrayBuffers returned by the HTML5 File API, and leverages the soon-to-be-landed-in-firefox [asm.js](http://asmjs.org/spec/latest/) with whose support its within *half of native speed*!

## Installing

### Node.JS

There is really no point in doing this, since Node.JS already has a wonderful `crypto` module that is leveraging low-level hardware instructions to perform really nice. Your can see the comparison below in the benchmarks.

Rusha is available on [npm](http://npmjs.org/) via `npm install rusha`.

If you still want to do this, anyhow, just `require()` the `rusha.js` file, follow the instructions on _Using the Rusha Object_.

### Browser

Rusha is available on [bower](http://twitter.github.com/bower/) via `bower install rusha`.

It is highly recommended to run CPU-intensive tasks in a [Web Worker](http://developer.mozilla.org/en-US/docs/DOM/Using_web_workers). To do so, just start a worker with `var worker = new Worker('rusha.js')` and start sending it jobs. Follow the instructions on _Using the Rusha Worker_.

If you can't, for any reason, use Web Workers, include the `rusha.js` file in a `<script>` tag and follow the instructions on _Using the Rusha Object_.

## Using the Rusha Object

Your instantiate a new Rusha object by doing `var r = new Rusha(optionalSizeHint)`. When created, it provides the following methods:

- `Rusha#digest(d)`: Create a hex digest from data of the three kinds mentioned below, or throw and error if the type is unsupported.
- `Rusha#digestFromString(s)`: Create a hex digest from a binary `String`. A binary string is expected to only contain characters whose charCode < 256.
- `Rusha#digestFromBuffer(b)`: Create a hex digest from a `Buffer` or `Array`. Both are expected to only contain elements < 256.
- `Rusha#digestFromArrayBuffer(a)`: Create a hex digest from an `ArrayBuffer` object.

## Using the Rusha Worker

You can send your instance of the web worker messages in the format `{id: jobid, data: dataobject}`. The worker then sends back a message in the format `{id: jobid, hash: hash}`, were jobid is the id of the job previously received and hash is the hash of the data-object you passed, be it a `Blob`, `Array`, `Buffer`, `ArrayBuffer` or `String`.

## Benchmarks

Tested were my Rusha implementation, the sha1.js implementation by [P. A. Johnston](http://pajhome.org.uk/crypt/md5/sha1.html), Tim Caswell's [Cifre](http://github.com/openpeer/cifre) and the Node.JS native implementation.

If you want to check the performance for yourself in your own browser, I compiled a [JSPerf Page](http://jsperf.com/rusha).

A normalized estimation based on the best results for each implementation, smaller is better:
![rough performance graph](http://awesam.de/rusha/bench/unscientific01.png)

Results per Implementation and Browser, smaller is better, again:
![performance graph](http://awesam.de/rusha/bench/unscientific02.png)

The best results for each implementation:

	   4096 bytes: Native:  0ms, Rusha:  1ms, Johnston:   3ms, Cifre:    4ms
	1048576 bytes: Native:  4ms, Rusha: 11ms, Johnston:  55ms, Cifre:  150ms
	4194304 bytes: Native: 17ms, Rusha: 41ms, Johnston: 211ms, Cifre:  614ms
	8388608 bytes: Native: 37ms, Rusha: 80ms, Johnston: 428ms, Cifre: 1205ms

All tests were performed on a MacBook Air 1.7 GHz Intel Core i5 and 4 GB 1333 MHz DDR3. Detailed results below.

Firefox Nightly (with asm.js support) 22.0a1:

	Benchmarking 4096 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted e217ea942d68455677ca703baea41367ead7e912 in 1 milliseconds
	Johnst.  emitted e217ea942d68455677ca703baea41367ead7e912 in 3 milliseconds
	Cifre    emitted e217ea942d68455677ca703baea41367ead7e912 in 5 milliseconds
	Benchmarking 1048576 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted f39c96db473b722e6ecd0f429807588b198c931c in 11 milliseconds
	Johnst.  emitted f39c96db473b722e6ecd0f429807588b198c931c in 82 milliseconds
	Cifre    emitted f39c96db473b722e6ecd0f429807588b198c931c in 183 milliseconds
	Benchmarking 4194304 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted df59869d022e543d26fa9c80b78349c8c3a7372f in 41 milliseconds
	Johnst.  emitted df59869d022e543d26fa9c80b78349c8c3a7372f in 243 milliseconds
	Cifre    emitted df59869d022e543d26fa9c80b78349c8c3a7372f in 633 milliseconds
	Benchmarking 8388608 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 709f1cdd1b69e3e692f92cd7aaeafa70bc3d93f1 in 80 milliseconds
	Johnst.  emitted 709f1cdd1b69e3e692f92cd7aaeafa70bc3d93f1 in 429 milliseconds
	Cifre    emitted 709f1cdd1b69e3e692f92cd7aaeafa70bc3d93f1 in 1312 milliseconds

Node (V8) 0.8.18:

	Benchmarking 4096 bytes ...
	Native   emitted 377322fdb03494521d8781c68ccad0be909bc39c in 0 milliseconds
	Rusha    emitted 377322fdb03494521d8781c68ccad0be909bc39c in 4 milliseconds
	Johnst.  emitted 377322fdb03494521d8781c68ccad0be909bc39c in 3 milliseconds
	Cifre    emitted 377322fdb03494521d8781c68ccad0be909bc39c in 9 milliseconds
	Benchmarking 1048576 bytes ...
	Native   emitted e7dcf18132f327aa3ff96198b10e733db2f7378e in 4 milliseconds
	Rusha    emitted e7dcf18132f327aa3ff96198b10e733db2f7378e in 30 milliseconds
	Johnst.  emitted e7dcf18132f327aa3ff96198b10e733db2f7378e in 98 milliseconds
	Cifre    emitted e7dcf18132f327aa3ff96198b10e733db2f7378e in 330 milliseconds
	Benchmarking 4194304 bytes ...
	Native   emitted d3c7af18250e3518eb961010c3d0d891c9431989 in 22 milliseconds
	Rusha    emitted d3c7af18250e3518eb961010c3d0d891c9431989 in 119 milliseconds
	Johnst.  emitted d3c7af18250e3518eb961010c3d0d891c9431989 in 396 milliseconds
	Cifre    emitted d3c7af18250e3518eb961010c3d0d891c9431989 in 1226 milliseconds
	Benchmarking 8388608 bytes ...
	Native   emitted ce99b2f0a3c4279bd5c33378ba83cc2569642053 in 34 milliseconds
	Rusha    emitted ce99b2f0a3c4279bd5c33378ba83cc2569642053 in 226 milliseconds
	Johnst.  emitted ce99b2f0a3c4279bd5c33378ba83cc2569642053 in 702 milliseconds
	Cifre    emitted ce99b2f0a3c4279bd5c33378ba83cc2569642053 in 2455 milliseconds

Chrome (V8) 25.0:

	Benchmarking 4096 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 2e69e5a3dcdf0b9a258656795e91219c8470157c in 6 milliseconds
	Johnst.  emitted 2e69e5a3dcdf0b9a258656795e91219c8470157c in 23 milliseconds
	Cifre    emitted 2e69e5a3dcdf0b9a258656795e91219c8470157c in 9 milliseconds
	Benchmarking 1048576 bytes
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 7edd589e41d6182818039e2433c951e3a9aa4893 in 72 milliseconds
	Johnst.  emitted 7edd589e41d6182818039e2433c951e3a9aa4893 in 250 milliseconds
	Cifre    emitted 7edd589e41d6182818039e2433c951e3a9aa4893 in 150 milliseconds
	Benchmarking 4194304 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 8ff4c621772029827b4b94326fe25fec257e3de4 in 242 milliseconds
	Johnst.  emitted 8ff4c621772029827b4b94326fe25fec257e3de4 in 993 milliseconds
	Cifre    emitted 8ff4c621772029827b4b94326fe25fec257e3de4 in 614 milliseconds
	Benchmarking 8388608 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 112df4d0e15ff90ce11bf613191db3b190b318d6 in 470 milliseconds
	Johnst.  emitted 112df4d0e15ff90ce11bf613191db3b190b318d6 in 1960 milliseconds
	Cifre    emitted 112df4d0e15ff90ce11bf613191db3b190b318d6 in 1205 milliseconds 

Safari 6.0.2:

	Benchmarking 4096 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted f73e06fd363306d948f15c2c5b19250b620996be in 5 milliseconds
	Johnst.  emitted f73e06fd363306d948f15c2c5b19250b620996be in 34 milliseconds
	Cifre    emitted f73e06fd363306d948f15c2c5b19250b620996be in 13 milliseconds
	Benchmarking 1048576 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 654bbffd41912d5e0deaefcf391c58e3150f94d0 in 937 milliseconds
	Johnst.  emitted 654bbffd41912d5e0deaefcf391c58e3150f94d0 in 7574 milliseconds
	Cifre    emitted 654bbffd41912d5e0deaefcf391c58e3150f94d0 in 2817 milliseconds
	Benchmarking 4194304 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted abdd60ca01aad6cb57d721857b63c6a3928a962b in 3795 milliseconds
	Johnst.  emitted abdd60ca01aad6cb57d721857b63c6a3928a962b in 31965 milliseconds
	Cifre    emitted abdd60ca01aad6cb57d721857b63c6a3928a962b in 12899 milliseconds
	Benchmarking 8388608 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted fd40b28b24fa98634a85db99e306bb4bd4580ec3 in 8189 milliseconds
	Johnst.  emitted fd40b28b24fa98634a85db99e306bb4bd4580ec3 in 70497 milliseconds
	Cifre    emitted fd40b28b24fa98634a85db99e306bb4bd4580ec3 in 24996 milliseconds

Firefox Aurora 21.0a2:

	Benchmarking 4096 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 349f713c66d8f88eaed58e087f9cc8b8c33bcecf in 2 milliseconds
	Johnst.  emitted 349f713c66d8f88eaed58e087f9cc8b8c33bcecf in 3 milliseconds
	Cifre    emitted 349f713c66d8f88eaed58e087f9cc8b8c33bcecf in 4 milliseconds
	Benchmarking 1048576 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted ebf9b8f7ab2ae5ddfe40887c5f0e5dbf88c889ab in 25 milliseconds
	Johnst.  emitted ebf9b8f7ab2ae5ddfe40887c5f0e5dbf88c889ab in 53 milliseconds
	Cifre    emitted ebf9b8f7ab2ae5ddfe40887c5f0e5dbf88c889ab in 161 milliseconds
	Benchmarking 4194304 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 30fa929476b34564ed1b977d33cc331d55dd06b0 in 83 milliseconds
	Johnst.  emitted 30fa929476b34564ed1b977d33cc331d55dd06b0 in 210 milliseconds
	Cifre    emitted 30fa929476b34564ed1b977d33cc331d55dd06b0 in 625 milliseconds
	Benchmarking 8388608 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted bc6a87bb491ba6befdd0555fcf79775fa6df02d2 in 165 milliseconds
	Johnst.  emitted bc6a87bb491ba6befdd0555fcf79775fa6df02d2 in 451 milliseconds
	Cifre    emitted bc6a87bb491ba6befdd0555fcf79775fa6df02d2 in 1256 milliseconds

Firefox 19.0.2:

	Benchmarking 4096 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 631800fc7cce39400fd7d5bffbf421821fbcf066 in 3 milliseconds
	Johnst.  emitted 631800fc7cce39400fd7d5bffbf421821fbcf066 in 3 milliseconds
	Cifre    emitted 631800fc7cce39400fd7d5bffbf421821fbcf066 in 4 milliseconds
	Benchmarking 1048576 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 80dd388d67a9ea4ac36dbbf9d58c59da8ec71132 in 73 milliseconds
	Johnst.  emitted 80dd388d67a9ea4ac36dbbf9d58c59da8ec71132 in 55 milliseconds
	Cifre    emitted 80dd388d67a9ea4ac36dbbf9d58c59da8ec71132 in 181 milliseconds
	Benchmarking 4194304 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 03b651c3edec8c8f77a5302af0e44523e946b762 in 277 milliseconds
	Johnst.  emitted 03b651c3edec8c8f77a5302af0e44523e946b762 in 214 milliseconds
	Cifre    emitted 03b651c3edec8c8f77a5302af0e44523e946b762 in 693 milliseconds
	Benchmarking 8388608 bytes ...
	Native   emitted unavailable in 0 milliseconds
	Rusha    emitted 908803b41d10fb94d2e97c9c16533c954e21b53d in 553 milliseconds
	Johnst.  emitted 908803b41d10fb94d2e97c9c16533c954e21b53d in 419 milliseconds
	Cifre    emitted 908803b41d10fb94d2e97c9c16533c954e21b53d in 1340 milliseconds
