# Loyyal chaincode implementation
This repo contains source code of loyyal chaincode of contract and transaction in typescript

### Building docker image

```
aws ecr get-login-password --region me-south-1 | docker login --username AWS --password-stdin 827830277284.dkr.ecr.me-south-1.amazonaws.com
docker build -t 827830277284.dkr.ecr.me-south-1.amazonaws.com/chaintest02:v1.0 .
docker push 827830277284.dkr.ecr.me-south-1.amazonaws.com/chaintest02:v1.0
```


### Running local 
```
npm i 
npm run build
cp .env.example .env


```
