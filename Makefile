
standard:
	./node_modules/.bin/standard

test:
	./node_modules/.bin/lab -c

test-cov:
	./node_modules/.bin/lab -t 99

test-cov-html:
	./node_modules/.bin/lab -r html -o ./coverage.html

test-cov-coveralls:
	./node_modules/.bin/lab -r lcov | ./node_modules/.bin/coveralls

.PHONY: standard test test-cov test-cov-html test-cov-coveralls