const logger = require('./logger');

function verifyLocalEnvironment() {
    const environment = process.env.NODE_ENV || 'development';
    logger.debug(`Ambiente atual: ${environment}, use os comandos com cuidado!`);
    return environment;
}

module.exports = { verifyLocalEnvironment };