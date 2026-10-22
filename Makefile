.PHONY: setup lint typecheck test accept verify check-protected release

setup:
	npm ci

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm test

accept:
	npm run accept

verify: lint typecheck test accept

check-protected:
	@scripts/check-protected-paths.sh $${BASE:-origin/main}

release:
	@test -n "$(VERSION)" || { echo "usage: make release VERSION=x.y.z"; exit 1; }
	@scripts/release.sh "$(VERSION)"
