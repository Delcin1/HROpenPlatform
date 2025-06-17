FROM gomicro/goose:3.24.1

RUN apk add --no-cache postgresql-client curl

WORKDIR /migrations

COPY *.sql ./
COPY migrate.sh ./

RUN chmod +x migrate.sh

CMD ["./migrate.sh"]