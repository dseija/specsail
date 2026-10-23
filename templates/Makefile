# SPECSAIL_UNCONFIGURED_TEMPLATE: replace these recipes with your project's real checks.
.PHONY: setup lint typecheck test accept verify check-protected

# Configure these commands for your project before using the workflow.
setup:
	@echo "Configure setup for this project's stack"; exit 1
lint:
	@echo "Configure lint for this project's stack"; exit 1
typecheck:
	@echo "Configure typecheck for this project's stack (or use a no-op if not applicable)"; exit 1
test:
	@echo "Configure unit/integration tests; exclude tests/acceptance/**"; exit 1
accept:
	@echo "Configure acceptance tests from tests/acceptance/**"; exit 1

verify: lint typecheck test accept

check-protected:
	@.specsail/scripts/check-protected-paths.sh "$${BASE:-}"
