/**
 * Created by Julian on 02.05.2017.
 */
const express = require('express');
const bodyParser = require('body-parser');
const loader = require('docker-config-loader');
const winston = require('winston');
const cors = require('cors');
let genericRouter = require('./routes/generic.router');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    'timestamp': true,
    'colorize': true
});
let config;
try {
    config = loader({secretName: 'secret_name', localPath: './config/main.json'});
} catch (e) {
    winston.error(e);
    winston.error('Failed to require config!');
    process.exit(1);
}
if (!config.provider) {
    return winston.error('No providers configured');
}
let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.dburl, (err) => {
    if (err) {
        winston.error("Unable to connect to Mongo Server!");
        process.exit(1);
    }
});
let app = express();
let AuthProvider = config.provider.auth.use ? require(config.provider.auth.classpath) : undefined;
let ap = config.provider.auth.use ? new AuthProvider(config.provider.auth) : undefined;
app.use((req, res, next) => {
    req.provider = {};
    if (ap !== undefined) {
        req.provider.auth = ap;
    } else {
        req.provider.auth = {
            needToken: () => {
                return false;
            },
            getUser: () => {
                return 'anonymous';
            }
        };
    }
    req.config = config;
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.use(genericRouter);
app.listen(config.port, config.host);
winston.info(`Server started ${config.host}:${config.port}`);