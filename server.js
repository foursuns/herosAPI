const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Jwt = require('@hapi/jwt');
const { join } = require('path');
const { ok } = require('assert');
const { config } = require('dotenv');

const env = process.env.NODE_ENV || "dev"
ok(env === "prod" || env === "dev", "environment not found! prod or dev");

const configPath = join('./environment', `.env.${env}`);

config({
    path: configPath
});

const swaggerOptions = {
  info: {
    title: 'Heros API',
    version: 'v1.0'
  },
  lang: 'pt'
}

const PORT = process.env.PORT;
const HOST = process.env.HOST;
const KEY  = process.env.KEY_JWT;

function mapRoutes(instance, methods) {
  return methods.map(method => instance[method]());
}

const init = async () => {
  const server = new Hapi.Server({
    port: PORT,
    host: HOST
  });

  await server.register([
    Inert,
    Jwt,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions
    }
  ]);

  server.auth.strategy('jwt_strategy', 'jwt', {
    keys: KEY,
    verify: {
      aud: 'urn:audience:test',
      iss: 'urn:issuer:test',
      sub: false,
      nbf: true,
      exp: true,
      maxAgeSec: 14400, // 4 hours
      timeSkewSec: 15
    },
    validate: (dado, request) => {
      return {
        isValid: true
      };
    }
  });

  server.auth.default('jwt_strategy');

  server.route([
    ...mapRoutes(new HeroRoutes(mongoDb), HeroRoutes.methods()),
    ...mapRoutes(new AuthRoutes(KEY, postgresModel), AuthRoutes.methods())
  ]);

  try {
    await server.start();  
    console.log(`server running at ${server.info.uri}`);
  } catch (error) {
    console.error(error);    
  }

}

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();
