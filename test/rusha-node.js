var
    fs = require("fs")
  , vm = require("vm");

var filename = "./rusha-test.js";
var code = fs.readFileSync(__dirname + "/" + filename);

vm.runInNewContext(code, {
    Rusha: require("../rusha")
  , expect: require("chai").expect
  , describe: describe
  , it: it
}, filename);