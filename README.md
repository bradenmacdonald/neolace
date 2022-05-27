# neolace (app)

This repository contains the web backend and frontend for [neolace](https://neolace.com).


## How to start running Neolace (dev)

1. Install Deno, Node.js, and Docker
1. Open this project in VS Code
1. Terminal > Run Task > 🗄️ Run Neolace Database Servers
1. Terminal > Run Task > ♻️ Erase Database and create default sites (you only need to run this the first time you start Neolace)
1. Terminal > Run Task > 🚀 Run Backend
1. Terminal > Run Task > 🚀 Run Frontend
1. See it at http://home.local.neolace.net:5555/

## How to analyze the frontend bundle's size

From the `frontend` folder, while the frontend is not running, run:

    ANALYZE=true npm run build

## How to test imgproxy locally

In production, we usually serve images via a CDN which sends its requests to
[imgproxy](https://imgproxy.net/) to generate image thumnbnails. In development,
this feature is disabled as we don't need to be running imgproxy and don't have
a CDN to cache the result. However, you can test it in development if that's
useful:

1. Copy the imgproxy settings from `docker-compose.yml` to `docker-compose.override.yml` and uncomment them.
1. In `frontend/.env.local`, set `NEXT_PUBLIC_IMGPROXY_ENABLED=true`
1. In `backend/neolace/app/config.ts`, set `objStorePublicUrlPrefixForImages` to `http://localhost:5558`
1. Restart the database servers (docker) and the frontend.
