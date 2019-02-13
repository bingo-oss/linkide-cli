var chalk = require('chalk');

const infoLabel = chalk.inverse.green("INFO");
const warningLabel = chalk.inverse("WARN");
const errorLabel = chalk.inverse("ERROR");

var utils = {};
utils.log = function(msg) {
    console.log(`${infoLabel} ${msg}`);
}
utils.warn = function(msg) {
    console.log(chalk.yellow(`${warningLabel} ${msg}`));
}
utils.error = function(msg) {
    console.log(chalk.red(`${errorLabel} ${msg}`));
    process.exit(1);
}
utils.isEmpty = function(obj){
    if(typeof obj == "undefined" || obj == null || obj == ""){
        return true;
    }else{
        return false;
    }
}
module.exports = utils;

