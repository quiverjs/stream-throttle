
test: 
	@NODE_ENV=test ./node_modules/.bin/mocha -t 5000;

.PHONY: test