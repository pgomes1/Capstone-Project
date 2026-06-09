PORT ?= 8000

.PHONY: install dev run lint typecheck test docker-build

install:
	pip install -r requirements.txt -r requirements-dev.txt

dev:
	uvicorn main:app --reload --port $(PORT)

run:
	uvicorn main:app --port $(PORT)

lint:
	ruff check .

typecheck:
	pyright

test:
	pytest

docker-build:
	docker build -t fit4life-backend .
