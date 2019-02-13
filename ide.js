#!/usr/bin/env node
var utils = require("./utils");
var yargs = require("yargs");

yargs.command({
    command:"source <action>",
    desc:"源操作,action取值包括:add|update|remove|list",
    builder:(yargs)=>{
        yargs.option('name', {
            alias: 'n',
            describe: '源名称,执行update|remove操作需要传入该参数'
        });
    },
    handler:(argv)=>{
        var action = argv.action;
        var name = argv.name;
        console.log(action + " "+ name)
    }
})
.command({
    command:"template <action>",
	desc:"模版操作,action取值包括:init|push",
	builder:(yargs)=>{
        yargs.option('source', {
            alias: 's',
            describe: '源名称,执行push操作需要传入该参数'
        });
    },
    handler:(argv)=>{
		var action = argv.action;
		var source = argv.source;
        console.log(action + " "+ source)
    }
})
.version()
.help()
.alias({
    "h": "help",
    "v": "version"
})
.strict(true)
.demandCommand()
.argv