# Assets DB

## Overview

Simulator for combined assets management.


## How to run Postgres on docker

`$ docker run -d --name postgres --rm -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:12-alpine`


## How to connect db

`$ psql "postgres://postgres:@localhost:5432/postgres"`


## How to run app

`$ DATABASE_URL=postgres://postgres:@localhost:5432/postgres npm start`


## How to browse Swagger API document

`http://localhost:8080/doc`


## Licensing

This code is licensed under MIT.


## Copyright

2022 K.Kimura @ Juge.Me all rights reserved.

