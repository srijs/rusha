rusha.js: rusha.sweet.js
	./node_modules/.bin/sjs rusha.sweet.js -r -o rusha.js

rusha.min.js: rusha.js
	./node_modules/.bin/jsmin rusha.js > rusha.min.js
