const profiler = require('v8-profiler');

const Rusha = require('../dist/rusha.js');

profiler.startProfiling('');

const bytes = new ArrayBuffer(1 * 1024 * 1024 * 1024);
console.error(Rusha.createHash().update(bytes).digest('hex'));

const profile = profiler.stopProfiling('');

profile.export((err, result) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  process.stdout.write(result);
});
