.PHONY: help install dev build start lint check clean

help:
	@echo "Available commands:"
	@echo "  make install  - install npm dependencies"
	@echo "  make dev      - run local Next.js dev server"
	@echo "  make build    - create production build"
	@echo "  make start    - run production server after build"
	@echo "  make lint     - run ESLint"
	@echo "  make check    - run lint and build"
	@echo "  make clean    - remove local Next.js build output"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

check: lint build

clean:
	rm -rf .next
