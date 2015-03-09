
test:
	./node_modules/.bin/lab

test-cov:
	./node_modules/.bin/lab -t 95

test-cov-html:
	./node_modules/.bin/lab -r html -o ./coverage.html

test-cov-coveralls:
	./node_modules/.bin/lab -r lcov | ./node_modules/.bin/coveralls

.PHONY: test test-cov test-cov-html test-cov-coveralls