# 美股收盘日报网站

这是一个轻量静态网站 MVP，用来展示每日《美股收盘日报》并保留历史归档。

## 当前功能

- 首页默认显示最新日报
- 左侧日期归档，可切换历史日报
- 中文排版、表格、主题强弱条形图
- 每篇日报保留来源链接
- 不依赖数据库或后端

## 本地查看

直接打开：

```text
index.html
```

如果部署到 Vercel、Netlify 或 GitHub Pages，直接把整个文件夹作为静态网站发布即可。

## 文件结构

```text
index.html
styles.css
app.js
data/reports.js
```

日报数据保存在 `data/reports.js`。以后新增日报时，在 `window.MARKET_REPORTS` 数组里追加一条新的日报对象即可。网站会按日期自动把最新的一篇放在首页。

## 下一步建议

1. 将仓库连接到 Netlify，让 Netlify 在每次 GitHub 更新后自动发布。
2. 在 GitHub Secrets 中设置 `OPENAI_API_KEY`，让 `.github/workflows/daily-report.yml` 每天美东 18:00 生成新日报并提交到仓库。
3. 后续增加搜索、股票筛选、板块热力图和重点股票追踪页。

## 全自动更新

全自动链路如下：

```text
GitHub Actions 定时运行
→ OpenAI API 生成最新中文日报
→ 更新 data/reports.js
→ 自动提交到 GitHub
→ Netlify 监听到提交并自动重新发布网站
```

GitHub 需要设置：

- `Settings` → `Secrets and variables` → `Actions` → 新增 secret：`OPENAI_API_KEY`
- `Settings` → `Actions` → `General` → Workflow permissions 选择 `Read and write permissions`

Netlify 需要设置：

- `Add new project` → `Import an existing project`
- 选择 GitHub 仓库
- Build command 留空
- Publish directory 填 `.`
