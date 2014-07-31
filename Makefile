
test:
	./node_modules/.bin/lab

coverage:
	./node_modules/.bin/lab -c

report:
	./node_modules/.bin/lab -c -r html > coverage.html

.PHONY: test