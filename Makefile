# ArQ / DebugLeaf. Run from repo root on Ojus's laptop. Adjust BACKEND_APP to the real module.
API_URL ?= http://127.0.0.1:8000
BACKEND_DIR ?= backend
BACKEND_APP ?= app.main:app
.PHONY: setup assets openapi types dev-api dev-web dev-mobile android build-web typecheck test verify zip

setup:
	cd frontend && npm ci
	cd apps/driver-mobile && npm ci
	cd $(BACKEND_DIR) && python -m pip install -r requirements.txt

assets:
	bash scripts/install-assets.sh

openapi:
	mkdir -p contract
	curl -sf $(API_URL)/openapi.json -o contract/openapi.json
	@echo "Saved contract/openapi.json"

types: openapi
	mkdir -p packages/shared-types/src
	npx --yes openapi-typescript contract/openapi.json -o packages/shared-types/src/api.d.ts

dev-api:
	cd $(BACKEND_DIR) && uvicorn $(BACKEND_APP) --host 0.0.0.0 --port 8000 --reload

dev-web:
	cd frontend && VITE_API_URL=$(API_URL) npm run dev

dev-mobile:
	cd apps/driver-mobile && npx expo start --dev-client

android:
	cd apps/driver-mobile && npx expo prebuild --platform android && npx expo run:android

build-web:
	cd frontend && npm run build

typecheck:
	cd frontend && npx tsc --noEmit
	@if [ -d "apps/driver-mobile" ]; then cd apps/driver-mobile && npx tsc --noEmit; fi

test:
	cd frontend && npx vitest run
	@if [ -d "$(BACKEND_DIR)" ]; then cd $(BACKEND_DIR) && python -m pytest -q; fi

verify: typecheck test build-web
	cd apps/driver-mobile && npx expo export --platform android --output-dir /tmp/arq-export
	@echo "verify OK (expo export proves bundling only, not device behaviour)"

zip:
	python3 -c "import shutil;shutil.make_archive('arq-release','zip','.','frontend')"
