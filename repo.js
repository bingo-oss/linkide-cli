#!/usr/bin/env node
var utils = require("./utils");
var yargs = require("yargs");
var fs = require("fs-extra");
var os = require("os");
var path = require("path");
var childProcess = require('child_process');
var prompt = require('prompt');

//默认源
var defaultSource = [{
    name:"品高软件",
    url:"https://github.com/bingo-oss/linkrepo-hub.git",
    token: "gxtvJXHE2KzRSh_6Kk-H",
    official:true
}]

//相关路径
var linkideFolder = path.join(os.homedir(),".linkide");
var linkideReposFolder = path.join(linkideFolder,"repos");
fs.ensureDirSync(linkideFolder);
fs.ensureDirSync(linkideReposFolder);

var jsonFile = path.join(linkideFolder,"source.json");

//如不存在则新建
if(!fs.existsSync(jsonFile)){
    fs.writeFileSync(jsonFile,JSON.stringify(defaultSource,null,2));
}

function linkideSourceJSON(){
    utils.log(jsonFile);
    try{
        var content = fs.readJSONSync(jsonFile);
        return content;
    }catch(e){
        return {};
    }
}

//添加源
function addSource(argv){
    var url = argv.url;
    var name = argv.name;
    var token = argv.token;
    if(!url.endsWith(".git")){
        utils.error("不合法的url，仅支持git协议、http/https协议的地址");
        return;
    }
    //todo check params
    var settings = linkideSourceJSON();
    var sources = settings.sources;
    var exist = false;

    for(var i = 0;i< sources.length;i++){
        if(sources[i].name == name){
            exist = true;
            break;
        }
    }
    if(!exist){
        var newSource = {
            name:name,
            url:url,
            token:token
        }
        settings.sources.push(newSource);
        fs.writeFile(jsonFile,JSON.stringify(settings,null,2));
        utils.log(`【新增】源:${name} 地址:${url}`);
        fetchSource(newSource);
    }else{
        utils.warn("已经存在同名的源");
    }
}

//更新源
function updateSource(argv){
    var name = argv.name;
    var settings = linkideSourceJSON();
    var sources = settings.sources;
    var exist = false;
    for(var i = 0;i< sources.length;i++){
        if(sources[i].name == name){
            exist = true;
            fetchSource(sources[i]);
            break;
        }
    }
    if(!exist){
        utils.error(`没有找到名字为【${name}】的源信息`);
    }
}

//拉取源资源
function fetchSource(source,callback){
    var url = source.url;
    var rName = url.substr(url.lastIndexOf("/")+1).replace(".git","");//源名称,和记录的source不通，这里是通过url来获取

    let command = `git clone ${url}`;
    let cwd = linkideReposFolder;
    //已经存在则 pull，否则clone
    let sourcePath = path.join(linkideReposFolder,rName);
    if(fs.existsSync(sourcePath)){
        command = `git pull`;
        cwd = sourcePath;
    }
    var cloneProcess = childProcess.exec(command, {
        cwd: cwd
    });
    cloneProcess.stdout.on('data', data => {
        utils.log(data);
    });
    cloneProcess.stderr.on('data', data => {
        utils.log(data);
    });
    cloneProcess.on('exit', (code, signal) => {
        callback && callback(this.projectPath);
        utils.log("执行完成")
    });
}

//列出所有源
function listSource(){
    var sources = linkideSourceJSON();
    if(sources.length==0){
        sources = defaultSource;
        fs.writeFileSync(jsonFile,JSON.stringify(defaultSource,null,2));
    }
    sources.forEach((item,index)=>{
        utils.log(`源:${item.name} 地址:${item.url}`);
    });
}

//删除源
function removeSource(argv){
    var name = argv.name;
    var settings = linkideSourceJSON();
    var sources = settings.sources;
    var newSources = [];
    var exist = false;
    var selectSource; //匹配的source
    for(var i = 0;i< sources.length;i++){
        if(sources[i].name == name){
            exist = true;
            utils.log(`【删除】源:${sources[i].name} 地址:${sources[i].url}`);
            selectSource = sources[i];
        }else{
            newSources.push(sources[i]);
        }
    }
    if(!exist){
        utils.error(`没有找到名字为【${name}】的源信息`);
    }else{
        settings.sources = newSources;
        fs.writeFile(jsonFile,JSON.stringify(settings,null,2));
        //强制删除仓库源码
        if(argv.force){
            var url = selectSource.url;
            var rName = url.substr(url.lastIndexOf("/")+1).replace(".git","");//源名称,和记录的source不通，这里是通过url来获取
            let sourcePath = path.join(linkideReposFolder,rName);
            fs.remove(sourcePath);
        }
    }
}

//创建模版工程
function createTemplateProject(argv){
    prompt.start();
    prompt.get([{
        "name": "name",
        "description":"模版名称",
        "message":"模版名称不能为空",
        "required":true
      },{
        "name": "type",
        "description":"模版类型(bui/weex/jmms/mvue)",
        "message":"模版类型不能为空",
        "required":true
      }], function (err, result) {
        var name = result.name;
        var type = result.type;
        var jsonFile = path.join(`${name}.json`);
        var readmeFile = path.join("README.md");
        var src = path.join("content");
        fs.ensureFileSync(jsonFile);
        fs.ensureFileSync(readmeFile);
        var info = {
            "name":name,
            "displayname":name,
            "type":type,
            "tag":"",
            "desc":"",    
            "version":"1.0.0",
            "url":"",
            "author":"",
            "email":"",
            "homepage":"",
            "snapshot":[],
        };
        fs.writeFileSync(jsonFile,JSON.stringify(info,null,2));
        fs.ensureDir(src);
    });
}

//发布模版
function publishTemplate(argv){
    //校验json合法
    //检查是否有src
    //检查目录结构
    fs.readdir(".",function(err,files){
        if(err){
            utils.error(err)
        }else{
            var jsonFile = [];
            var src;
            files.forEach(function(filename){
                if(filename.endsWith(".json")){
                    jsonFile.push(filename);
                }
                if(filename.endsWith("src")){
                    src = filename;
                }
            });
            if(jsonFile.length>1){
                utils.warn("检查到有多个json文件,发布目录只保留一个。");
                utils.warn(jsonFile);
                return;
            }
            if(!src){
                utils.warn("模版源码必须放在src目录下");
                return;
            }
            var content;
            try{
                content = fs.readJSONSync(path.resolve()+path.sep+jsonFile);
                console.log(content);
            }catch(e){
                utils.error("不合法的json文件，请仔细检查");
            }
            var isValid ;
            isValid = checkJSON(content);
            if(isValid){
                checkRepo(content);
            }
        }
    });
}

//校验json内容
function checkJSON(data){
    var result = true;
    var ignoreField = ["desc","author","email","homepage","snapshot"];
    for(var key in data){
        if(!ignoreField.includes(key)){
            if(utils.isEmpty(data[key])){
                utils.warn(`注意 ${key} 不能为空`);
                result = false;
            }
            if(key=="url"){
                if(!data[key].startsWith("http") || data[key].endsWith(".git")){
                    utils.warn(`模版地址必须以http://或者https://开头，以.git结尾`)
                    result = false;
                }
            }
        }
    }
    return result;
}
//检查模版版本、tag等
function checkRepo(data){
    var name = data.name;
    var type = data.type;
    var tag = data.tag;
    var version = data.version;
    var url = data.url;


}


//组装命令
yargs.command({
    command:"source",
    desc:"添加源",
    builder:(yargs)=>{
        yargs.option('template', {
            alias: 't',
            describe: 'Init with specified template.'
        });
    },
    handler:(argv)=>{
        addSource(argv);
    }
})
.command({
    command:"update <name>",
    desc:"更新源",
    handler:(argv)=>{
       updateSource(argv);
    }
})
.command({
    command:"remove <name>",
    desc:"移除源",
    builder:(yargs)=>{
        return yargs.option('force',{
            describe:"同时强制删除仓库源内容"
        })
    },  
    handler:(argv)=>{
        removeSource(argv);
    }
})
.command({
    command: "list",
    desc: "列出所有源",
    handler: function(argv) {
        listSource();
    }
})
.command({
    command:"init",
    desc:"初始化模版工程",
    handler:function(argv){
        createTemplateProject(argv);
    }
})
.command({
    command:"publish <source-name>",
    desc:"发布到指定仓库源",
    handler:function(argv){
        publishTemplate(argv)
    }
})
.version()
.help()
.strict(true)
.demandCommand()
.argv