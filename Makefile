
test:
	./node_modules/.bin/lab -l

test-cov:
	./node_modules/.bin/lab -l -t 99

test-cov-html:
	./node_modules/.bin/lab -l -r html -o ./coverage.html

.PHONY: test test-cov test-cov-html