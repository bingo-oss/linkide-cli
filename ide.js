#!/usr/bin/env node
const handler = require('./handler');
const yargs = require('yargs');

handler.init();
handler.dependencyCheck();

// 组装命令
// eslint-disable-next-line no-unused-expressions
yargs
  .command({
    command: 'source <action>',
    desc: '源操作,action取值包括:add|update|remove|list',
    builder: yargs => {
      yargs.option('force', {
        alias: 'f',
        describe: '强制删除操作'
      });
    },
    handler: argv => {
      const action = argv.action;
      switch (action) {
        case 'add':
          handler.addSource(argv);
          break;
        case 'update':
          handler.updateSource(argv);
          break;
        case 'remove':
          handler.removeSource(argv);
          break;
        case 'list':
          handler.listSource(argv);
          break;
        default:
        // todo
      }
    }
  })
  .command({
    command: 'template <action>',
    desc: '模版操作,action取值包括:init|push',
    handler: argv => {
      const action = argv.action;
      switch (action) {
        case 'init':
          handler.templateInit(argv);
          break;
        case 'push':
          handler.templatePush(argv);
          break;
        default:
        // todo
      }
    }
  })
  .version()
  .help()
  .alias({
    'h': 'help',
    'v': 'version'
  })
  .strict(true)
  .demandCommand()
  .argv;
