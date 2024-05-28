# STAGE 1 - build the react app 
# set the base image to build from 
# This is the application image from which all other subsequent 
# applications run. Alpine Linux is a security-oriented, lightweight 
#(~5Mb) Linux distribution.
FROM node:alpine as build

# set working directory
# this is the working folder in the container from which the app
# will be running from
WORKDIR /app

# add the node_modules folder to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# copy package.json file to /app directory for installation prep
COPY ./package.json /app/

# install dependencies
RUN npm install

# copy everything to /app directory
COPY . /app

# build the app 
RUN npm run build

# Expose port 80 for HTTP Traffic 
EXPOSE 3000

# start the nginx web server

CMD ["node", "/app/dist/index.js"]

