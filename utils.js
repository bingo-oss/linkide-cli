const chalk = require('chalk');
const infoLabel = chalk.inverse.green('INFO');
const warningLabel = chalk.inverse('WARN');
const errorLabel = chalk.inverse('ERROR');
const { exec } = require('child_process');

const utils = {};
utils.log = function (msg) {
  console.log(`${infoLabel} ${msg}`);
};

utils.warn = function (msg) {
  console.log(chalk.yellow(`${warningLabel} ${msg}`));
};

utils.error = function (msg) {
  console.log(chalk.red(`${errorLabel} ${msg}`));
  process.exit(1);
};

utils.isEmpty = function (obj) {
  if (typeof obj === 'undefined' || obj === null || obj === '') {
    return true;
  } else {
    return false;
  }
};

utils.parseGitCloneUrl = function (url, username, password) {
  // https://gitlab.bingosoft.net/linkide/source-template-hub.git
  if (/^https?:\/\//.test(url.toLowerCase())) {
    return url.replace(RegExp.lastMatch, `${RegExp.lastMatch}${username.replace(/@/g, '%40')}:${password.replace(/@/g, '%40')}@`);
  } else {
    return new Error('repository URL 不是 HTTP/HTTPS 格式');
  }
};

utils.getGitUrlName = function (url) {
  return url.substr(url.lastIndexOf('/') + 1).replace('.git', '');
};

utils.randomString = function (length) {
  const len = length || 32;
  const $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const base = $chars.length;
  let result = '';
  for (let i = 0; i < len; i++) {
    const pos = Math.random() * base;
    result += $chars.charAt(~~pos);
  }
  return result.toLowerCase();
};

/**
 * 初始化 Git config，避免其本身存在的一些问题
 */
utils.initGitConfig = function () {
  exec('git config --global --list', (err, stdout, stderr) => {
    if (err) {
      console.error(err);
    } else {
      if (!stdout.includes('http.sslverify=false')) {
        console.info('Set git global config http.sslverify to false');
        exec('git config --global http.sslverify false');
      }
      if (!stdout.includes('core.quotepath=false')) {
        console.info('Set git global config core.quotepath to false');
        exec('git config --global core.quotepath false');
      }
    }
  });
};

module.exports = utils;
