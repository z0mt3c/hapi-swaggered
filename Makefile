
test:
	./node_modules/.bin/lab -c

coverage:
	./node_modules/.bin/lab -c -r html > coverage.html

.PHONY: test