start-docker:
	@docker compose up -d --build

stop-docker:
	@docker compose down -v

build:
	@docker compose exec --user=node action npm run build

watch:
	@docker compose exec --user=node action npm run watch

install:
	@docker compose exec --user=node action npm install

test:
	@docker compose exec --user=node action npm test

act-raw:
	@./bin/act

act:
	@docker compose exec --user=node action npm run build
	@docker stop act-push-yml-Download-strings-from-EasyTranslate | true
	@docker rm act-push-yml-Download-strings-from-EasyTranslate | true
	@docker volume rm act-push-yml-Download-strings-from-EasyTranslate  act-push-yml-Download-strings-from-EasyTranslate-env | true
	@./bin/act
