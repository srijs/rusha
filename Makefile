rusha.js: rusha.pp.js
	cpp < rusha.pp.js | grep -v "#" > rusha.js

rusha.min.js: rusha.js
	./node_modules/.bin/jsmin rusha.js > rusha.min.js
