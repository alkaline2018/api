# !/bin/bash

echo What should the version be?
read VERSION
echo $VERSION

docker build -t alkaline2018/wingsuit:$VERSION .
docker push alkaline2018/wingsuit:$VERSION
ssh root@188.166.248.46 "docker pull alkaline2018/wingsuit:$VERSION && docker tag alkaline2018/wingsuit:$VERSION dokku/api:$VERSION && dokku deploy api $VERSION"