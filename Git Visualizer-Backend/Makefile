# Git Visualizer backend — verification targets (prompt §7).
# On Windows, run these from Git Bash (or use the underlying commands directly).

MVNW := ./mvnw

.PHONY: build test coverage dep-check lint run up down \
        health-check seed-verify lb-check rate-limit-check headers-check verify-all

build:
	$(MVNW) clean install

test:
	$(MVNW) test

coverage:
	$(MVNW) test jacoco:report
	@echo "Report: target/site/jacoco/index.html (build fails below 70% line coverage during 'verify')"

dep-check:
	$(MVNW) org.owasp:dependency-check-maven:check

lint:
	$(MVNW) spotbugs:check

run:
	$(MVNW) spring-boot:run

up:
	docker compose up --build

down:
	docker compose down

health-check:
	bash scripts/health-check.sh

seed-verify:
	bash scripts/seed-verify.sh

lb-check:
	bash scripts/lb-check.sh

rate-limit-check:
	bash scripts/rate-limit-check.sh

headers-check:
	bash scripts/security-headers-check.sh

verify-all:
	bash scripts/verify-all.sh
