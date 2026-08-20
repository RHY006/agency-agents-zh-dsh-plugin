# agency-agents-zh-dsh-plugin

把 [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh)（268 个中文 AI 专家角色，覆盖 20 个部门）封装成 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 **bundle 插件**。

安装后，268 位专家会以 **原生 dsh skill** 注册进 skill 注册表：模型在对话中按描述自动匹配并加载对应专家角色，也可以用 `/技能名` 手动触发。

## 安装

> 前置要求：本机已安装 `git`（`github:` 安装依赖 pnpm 调用 git 拉取仓库）。

**方式一（推荐，GitHub 托管）**

```sh
dsh plugin --profile web add "github:RHY006/agency-agents-zh-dsh-plugin"
```

**方式二（本地目录）**

```sh
dsh plugin --profile web add ./agency-agents-zh-dsh-plugin
```

**方式三（npm tarball）**

```sh
npm pack --dry-run            # 确认内容
npm pack                      # 生成 agency-agents-zh-dsh-plugin-1.0.0.tgz
dsh plugin --profile web add ./agency-agents-zh-dsh-plugin-1.0.0.tgz
```

装完**重启 dsh**，然后问一句「你有哪些可用技能」即可看到全部专家。

## 用法

注册的 skill 名称取自文件 stem（已是合法 kebab-case），例如：

| 专家 | skill 名 | 激活方式 |
| --- | --- | --- |
| 前端开发者 | `engineering-frontend-developer` | 对话触发 / `/engineering-frontend-developer` |
| 小红书运营专家 | `marketing-xiaohongshu-operator` | 对话触发 / `/marketing-xiaohongshu-operator` |
| 安全工程师 | `engineering-security-engineer` | 对话触发 / `/engineering-security-engineer` |

## 工作原理

- `cordis.patch.yml` 作为 bundle 层向 profile 插入一行 loader，挂载 `index.js`。
- `index.js` 在 `apply()` 时遍历内置的 `agents.json`，逐个调用 `ctx.skills.register()` 把专家注册为运行时 skill（`source: 'runtime'`）。
- 每个 skill 的 `description` 来自专家 frontmatter（中文），用于模型路由；`content` 是完整的专家人设/工作流/交付物正文；`metadata` 保留中文名、emoji、配色和所属部门。

## 重新生成 agents.json

```sh
node scripts/build.mjs <path/to/agency-agents-zh-checkout>
```

构建脚本递归扫描各专家目录（排除仅含文档的 `strategy/`），只收录带 `name` + `description` frontmatter 的 Markdown，并校验 skill 名唯一且为 kebab-case。

## 关闭

不想加载专家技能时，在 profile 的 `cordis.patch.yml` 里禁用该 loader 行即可：

```yaml
- id: agency-agents-zh
  disabled: true
```

## 许可

MIT。角色内容版权归上游 [agency-agents](https://github.com/msitarzewski/agency-agents) 及 [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) 所有。