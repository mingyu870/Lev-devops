FROM node:20-alpine AS base

ARG NODE_ENV
ARG PROJECT
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/${PROJECT}

COPY package*.json ./
RUN npm install

FROM base AS builder
WORKDIR /usr/src/${PROJECT}
COPY . .
RUN npm install

RUN npm run build

CMD npm run start:${NODE_ENV}