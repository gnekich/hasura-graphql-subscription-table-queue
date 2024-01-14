# PoC Hasura Postgres Table Queue

This repository contains PoC on how to build a simple queue where Node.js workers (subscribed to GraphQL API) will take available jobs and mark them as "processing", update the timestamp once a while, while the processing of the job is in progress (so that we know they are working on something), and ability to retake jobs that are not in progress for more than n seconds.

This process uses few interesting tricks to achieve retake of the jobs and count retries, also it cleans up the completed jobs after 10 minutes. (It could be better designed currently every instance of the worker will try to do the cleanup)

## Start

### Clone the repository

```bash
git clone https://github.com/gnekich/hasura-graphql-subscription-table-queue
```

Install hasura CLI if you don't have it locally, or prefix everything with npx.

```bash
npm i -g hasura-cli
```

### Start the hasura stack

Using portainer you can locally spin a stack that contains postgres, hasura & hlambda. (Hopefully I will have time to update this with scripts to auto generate docker-compose deployments)

```yaml
# Stack name: local-development-your-project
version: "3.6"
services:
  postgres:
    image: postgres:12
    restart: always
    volumes:
      - hasura_db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
  graphql-engine:
    image: hasura/graphql-engine:latest
    ports:
      - "28085:8080"
    depends_on:
      - "postgres"
    restart: always
    environment:
      HASURA_GRAPHQL_STRINGIFY_NUMERIC_TYPES: true
      HASURA_GRAPHQL_METADATA_DATABASE_URL: "${HASURA_GRAPHQL_METADATA_DATABASE_URL}"
      HASURA_GRAPHQL_ADMIN_SECRET: "${HASURA_GRAPHQL_ADMIN_SECRET}"
      HASURA_GRAPHQL_ENABLE_TELEMETRY: "false"
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
      HASURA_GRAPHQL_ENABLED_LOG_TYPES: "startup, http-log, webhook-log, websocket-log, query-log"
      HASURA_GRAPHQL_JWT_SECRET: "${HASURA_GRAPHQL_JWT_SECRET}"
      ACTION_BASE_URL: "http://hlambda-core:1331"
  hlambda-core:
    image: hlambda/hlambda-core:latest
    environment:
      HLAMBDA_ADMIN_SECRET: "${HLAMBDA_ADMIN_SECRET}"
    ports:
      - "28086:1331"
    restart: always
    volumes:
      - hlambda_metadata:/usr/src/app/metadata

volumes:
  hasura_db_data:
  hlambda_metadata:
```

Generate `.env` for your deployment and load the file to the portainer stack.

```dotenv
POSTGRES_PASSWORD="postgres_DeMo_Password"
HASURA_GRAPHQL_METADATA_DATABASE_URL="postgres://postgres:postgres_DeMo_Password@postgres:5432/postgres"
HASURA_GRAPHQL_ADMIN_SECRET="HaSuRa_DeMo_PaSsWoRd"
HASURA_GRAPHQL_JWT_SECRET='{"claims_namespace_path":"$", "type":"RS256", "key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsgZFe7ec9GGFtcrLBBUF\nd9y1liCPeaOObAPwhhiIy2Q/37/EqvoI3E87osbkkF8wN6TI8Gry8ag68KO8RHdz\nkul4YoKnPl9C3RPYS/H6s5MYWkooNkuTRgBlNsZiofDU1UuDjAVGk5yceqrM5fvG\nBPllOhsRhoADSgcrqG2GwfdsAIrGtSuy214lY2DxtK6aOlhyUHQj+0KS8fPOQL/+\nTVx16Cj4nxJm+1Cr5UEdaMSKDbcW6eEu1L1gq7I87hDaatz0woEVDLXArMXHk1pq\nDDw9BJ5J/IFRGe5mAze3aFC9AwoIzXNTOqMMFnEUZetbRV+Uyiu3d/y3zz5kDf7P\n1wIDAQAB\n-----END PUBLIC KEY-----\n"}'
HLAMBDA_ADMIN_SECRET="HlAmBdA_DeMo_PaSsWoRd"
```

#### Apply the metadata

```bash
hasura metadata apply --envfile .env
```

#### Add a postgres table. Do the migrations...

```bash
hasura migrate apply --envfile .env
```

You should probably again run metadata apply, or go into the hasura console and reload the metadata because there is some kind of a bug because command

```bash
hasura metadata reload --envfile .env
```

does not work.

#### Exporting changes (For development only)

```bash
hasura metadata export --envfile .env
hasura migrate create init --from-server --envfile .env
```

---

You can start a worker by

```bash
npm start
```

I've tested it by running 4-5 workers at the same time.

and ofc in separate terminal you can generate some jobs by running

```bash
npm add-jobs
```
