# Assets DB


## How to run Postgres on docker

`$ docker run -d --name postgres --rm -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:12-alpine`

`$ DATABASE_URL=postgres://postgres:@localhost:5432/postgres npm start`

## Licensing

This code is licensed under MIT.


## Copyright

2022 K.Kimura @ Juge.Me all rights reserved.

