rusha.js: rusha.pp.js
	cpp < rusha.pp.js | grep -v "#" | ./node_modules/.bin/jsmin > rusha.js
