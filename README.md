# Secret Words Game
A Secret Words game to play when you're stuck at home and so are all your friends

## Configre local:

Add an `.env` file to this directory with:

```
# AWS credentials
AWS_KEY=
AWS_SECRET=
```

## Run:

```
npm run dev
```

## Configure Production

```
# AWS credentials
now secret add secret-words-aws-key [some-value]
now secret add secret-words-aws-secret [some-value]
```

## Deploy

```
now
```
