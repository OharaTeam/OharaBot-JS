const { verifyLocalEnvironment } = require('./verifyEnvironment');
const logger = require('./logger');

function getApiDestination(endpoint) {
    const environment = verifyLocalEnvironment();
    if (environment === 'development') {
        logger.debug(`Ambiente de desenvolvimento detectado. Usando URL local para endpoint: ${endpoint}`);
        return `http://localhost:3000/${endpoint}`;
    } else {
        logger.debug(`Ambiente de produção detectado. Usando URL de produção para endpoint: ${endpoint}`);
        return `${process.env.BACK_END_URL}/${endpoint}`;
    }
}

module.exports = { getApiDestination };