
test:
	./node_modules/.bin/lab

coverage:
	./node_modules/.bin/lab -c -t 99

report:
	./node_modules/.bin/lab -c -t 99 -r html -o ./coverage.html

.PHONY: test