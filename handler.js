const utils = require('./utils');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const prompts = require('prompts');
const commandExists = require('command-exists').sync;
const git = require('simple-git/promise');

// 相关路径
const linkideFolder = path.join(os.homedir(), '.linkide');
const linkideSourceFolder = path.join(linkideFolder, 'source');
const jsonFile = path.join(linkideFolder, 'source.json');
const defaultSource = {
  name: '品高软件',
  url: 'https://github.com/bingo-oss/source-template-hub.git',
  username: 'linkfactory',
  password: 'factory_2019'
};

// git环境初始化
utils.initGitConfig();

// 内部使用的对象
const private = {};
// 拉取源
private.fetchSource = function (source) {
  const url = source.url;
  const name = utils.getGitUrlName(url);
  const cloneUrl = utils.parseGitCloneUrl(source.url, source.username, source.password);

  let cwd = linkideSourceFolder;
  // 已经存在则 pull，否则clone
  const sourcePath = path.join(linkideSourceFolder, name);
  if (fs.existsSync(sourcePath)) {
    cwd = sourcePath;
    return git(cwd)
      .pull()
      .then(() => utils.log('源信息拉取完成'))
      .catch(error => utils.error(error));
  } else {
    return git(cwd).silent(true)
      .clone(cloneUrl)
      .then(() => utils.log('源信息拉取完成'))
      .catch(error => utils.error(error));
  }
};
// 选择源
private.selectSource = function (msg, needDefault) {
  const sources = this.sourceJSON();
  if (sources.length === 0) {
    utils.error('当前环境没有可以操作的的源');
    return;
  }
  const choices = [];
  // 内置官方源
  if (needDefault) {
    choices.push({ title: defaultSource.name, value: defaultSource.name });
  }
  sources.forEach(el => {
    choices.push({ title: el.name, value: el.name });
  });
  const conditions = [
    {
      name: 'name',
      type: 'select',
      message: msg || '选择要提交到哪个源',
      choices: choices,
      initial: 0
    }
  ];
  return prompts(conditions);
};
// 获取source.json内容
private.sourceJSON = function () {
  try {
    const content = fs.readJSONSync(jsonFile);
    return content;
  } catch (e) {
    return [];
  }
};
// 根据name获取source
private.getSourceByName = function (name) {
  const sources = this.sourceJSON();
  return sources.find(item => {
    return item.name === name;
  });
};

const handler = {};
// 初始化相关目录
handler.init = function () {
  fs.ensureDirSync(linkideFolder);
  fs.ensureDirSync(linkideSourceFolder);
  // 如不存在则新建
  if (!fs.existsSync(jsonFile)) {
    fs.writeFileSync(jsonFile, JSON.stringify([], null, 2));
  }
};
// 依赖检查:git
handler.dependencyCheck = function () {
  if (!commandExists('git')) {
    utils.error('检测到尚未安装git，请前往https://www.git-scm.com/download/安装依赖');
  }
};
// 添加源
handler.addSource = function (argv) {
  const conditions = [
    {
      name: 'url',
      type: 'text',
      message: '源地址(http/https协议的git地址)',
      validate: value => {
        if (!value.endsWith('.git')) {
          return `请输入合法的git地址`;
        }
        return true;
      }
    },
    {
      name: 'name',
      type: 'text',
      message: '源名称(建议用英文)'
    },
    {
      name: 'username',
      type: 'text',
      message: 'Git用户名',
      validate: value => (value === '' ? `用户名不能为空` : true)
    },
    {
      name: 'password',
      type: 'text',
      message: 'Git密码',
      validate: value => (value === '' ? `密码不能为空` : true)
    }
  ];
  prompts(conditions).then(result => {
    const url = result.url;
    let name = result.name;
    if (name === '') {
      name = utils.getGitUrlName(url);
    }
    const username = result.username;
    const password = result.password;
    const sources = private.sourceJSON();
    const exist = sources.filter(item => {
      return item.name === name;
    }).length > 0;
    if (exist) {
      utils.warn('已经存在同名的源,换个名字吧');
      return;
    }
    const newSource = {
      name: name,
      url: url,
      username: username,
      password: password,
      id: utils.randomString(32)
    };
    sources.push(newSource);
    // 获取源内容
    private.fetchSource(newSource).then(() => {
      fs.writeFile(jsonFile, JSON.stringify(sources, null, 2));
      utils.log(`【新增】源:${name} 地址:${url}`);
    });
  });
};
// 更新源
handler.updateSource = function (argv) {
  private.selectSource('选择要更新哪个源', true)
    .then(result => {
      let source;
      if (result.name === defaultSource.name) {
        source = defaultSource;
      } else {
        source = private.getSourceByName(result.name);
      }
      private.fetchSource(source);
    });
};
// 删除源
handler.removeSource = function (argv) {
  const force = argv.force;
  const sources = private.sourceJSON();
  const newSources = [];
  private.selectSource('选择要删除的源')
    .then(result => {
      const name = result.name;
      let selectSource; // 匹配的source
      for (const obj of sources) {
        if (obj.name === name) {
          selectSource = obj;
        } else {
          newSources.push(obj);
        }
      }
      fs.writeFile(jsonFile, JSON.stringify(newSources, null, 2));
      // 强制删除仓库源码
      if (force) {
        const url = selectSource.url;
        const rName = utils.getGitUrlName(url);
        const sourcePath = path.join(linkideSourceFolder, rName);
        fs.remove(sourcePath);
      }
    });
};
// 列出源列表
handler.listSource = function (argv) {
  const sources = private.sourceJSON();
  sources.push(defaultSource);
  sources.forEach((item, index) => {
    utils.log(`源名称:${item.name} 地址:${item.url}`);
  });
};
// 初始化模版 必须当前目录操作
handler.templateInit = function (argv) {
  const conditions = [
    {
      name: 'name',
      type: 'text',
      message: '模版名称'
    },
    {
      name: 'type',
      type: 'select',
      message: '选择模版类型',
      choices: [
        { title: 'BUI模版', value: 'bui' },
        { title: 'WEEX模版', value: 'weex' },
        { title: 'JMMS模版', value: 'jmms' }
      ],
      initial: 0
    },
    {
      name: 'url',
      type: 'text',
      message: 'Git仓库地址'
    }
  ];
  prompts(conditions).then(result => {
    const name = result.name;
    const type = result.type;
    const url = result.url;
    let jsonFile = 'template.json';
    let readmeFile = 'README.md';
    let content = 'content';
    // 遇到git目录就不需要创建根文件夹了,否则创建
    if (!fs.existsSync(path.join('.git'))) {
      jsonFile = path.join(name, 'template.json');
      readmeFile = path.join(name, 'README.md');
      content = path.join(name, 'content');
    }
    const temp1 = path.join(content, 'temp1');
    fs.ensureFileSync(jsonFile);
    fs.ensureFileSync(readmeFile);
    const info = {
      'name': name,
      'displayname': name,
      'type': [type],
      'tag': '',
      'desc': '',
      'version': '1.0.0',
      'url': url,
      'author': '',
      'email': '',
      'homepage': '',
      'snapshot': [],
      'packages': [
        { 'name': temp1, 'type': `${type}` }
      ]
    };
    fs.writeFileSync(jsonFile, JSON.stringify(info, null, 2));
    fs.writeFileSync(readmeFile, `#${name}`);
    fs.ensureDir(content);
    fs.ensureDir(temp1);
  });
};
// 发布模版（需要先提交代码并且打tag)
handler.templatePush = function (argv) {
  // 检查template.json的合法性
  const templateFile = path.join('template.json');
  if (!fs.existsSync(templateFile)) {
    utils.error('必须包含template.json文件,用于定义当前模版');
  }
  const templateJSON = fs.readJsonSync(templateFile);
  // todo 检查更多细节
  const checkFields = ['type', 'tag', 'name', 'displayname', 'desc', 'version', 'url', 'author'];
  for (const field of checkFields) {
    if (!templateJSON[field] || templateJSON[field] === '') {
      utils.error(`缺少${field}字段,请检查template.json`);
    }
  }
  const version = templateJSON.version;
  const name = templateJSON.name;
  const p1 = git().checkIsRepo();
  const p2 = git().tags();

  Promise.all([p1, p2]).then(result => {
    const isRepo = result[0];
    if (!isRepo) {
      utils.error('请先将模版提交到git进行管理');
    }
    const tags = result[1].all;
    if (!tags.includes(version)) {
      utils.error(`未找到版本号为【${version}】的源码,请检查是否已经打tag`);
    }
    // 选择要提交到哪个源
    private.selectSource('选择要发布的源', true)
      .then(result => {
        let source;
        if (result.name === defaultSource.name) {
          source = defaultSource;
        } else {
          source = private.getSourceByName(result.name);
        }
        const sourceRepoName = utils.getGitUrlName(source.url);
        console.log(sourceRepoName);
        const sourceRepoPath = path.join(linkideSourceFolder, sourceRepoName);
        console.log(sourceRepoPath);
        const sourceRepoTemplPath = path.join(sourceRepoPath, name, version);
        if (!fs.existsSync(sourceRepoPath)) {
          utils.error('请先拉取源内容，执行 linkide source update');
        }
        // 已经存在该模版
        if (fs.existsSync(sourceRepoTemplPath)) {
          utils.error(`已经存在版本号为【${version}】的源码，请更换版本号，打tag后再提交`);
        }
        // 拷贝内容到name/version目录
        fs.ensureDirSync(sourceRepoTemplPath);
        console.log(process.cwd());
        fs.copySync(process.cwd(), sourceRepoTemplPath);
        fs.removeSync(path.join(sourceRepoTemplPath, '.git'));
        fs.removeSync(path.join(sourceRepoTemplPath, 'content'));

        // 完成后再检查一遍是否包含了template.json
        if (fs.existsSync(path.join(sourceRepoTemplPath, 'template.json'))) {
          // 执行添加、提交动作
          const tGit = git(sourceRepoPath);
          tGit.add(sourceRepoTemplPath)
            .then(() => {
              utils.log('模版文件添加完成');
              tGit.commit(`name: ${name} version: ${version}`)
                .then(() => {
                  utils.log('模版提交完成');
                  tGit.push()
                    .then(() => {
                      utils.log('模版发布成功');
                    })
                    .catch(error => {
                      utils.error(error);
                    });
                })
                .catch(error => {
                  utils.error(error);
                });
            })
            .catch(error => {
              utils.error(error);
            });
        } else {
          fs.remove(sourceRepoTemplPath);
          utils.error('拷贝文件失败，请检查是否具有操作权限');
        }
      });
  });
};

module.exports = handler;
