.PHONY: all build build-debug test lint format typecheck examples smoke ci clean help

# Default target
all: build

##@ Build

build: ## Release build for the current platform
	npm run build

build-debug: ## Debug build for the current platform
	npm run build:debug

##@ Code quality (mirrors CI lint job)

lint: ## Rust fmt check + clippy + TS typecheck + Biome
	cargo fmt --check
	cargo clippy -- -D warnings
	npm run typecheck
	npm run lint

format: ## Auto-format Rust and JS/TS sources
	cargo fmt
	npm run format

typecheck: ## TypeScript type check only
	npm run typecheck

##@ Testing (mirrors CI test job)

test: build-debug ## Build debug addon then run Vitest suite
	npm test

##@ Examples & smoke (mirrors CI examples-docs-smoke job)

examples: build-debug ## Build debug addon then run all JS + TS examples
	npm run examples:list
	npm run example:all
	NONO_APPLY=1 npm run example:js:10-subprocess-inheritance
	NONO_APPLY=1 npm run example:ts:10-subprocess-inheritance

smoke: build-debug ## Run demonstrator dry-run and stale-docs check
	npm run demo:dry-run
	@if grep -R -n '/sdk/' docs; then \
		echo "Found stale /sdk/ routes in docs."; \
		exit 1; \
	fi

##@ Full CI replication

ci: lint test examples smoke ## Run everything CI runs, in order

##@ Utilities

clean: ## Remove built native addon and Cargo build artefacts
	rm -f *.node
	cargo clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
