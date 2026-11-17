# SignPath Foundation 申请与接入

免费签名由 SignPath Foundation 提供给符合条件的开源项目。证书的发布者显示为
SignPath Foundation，SmartScreen 信誉仍会按下载量积累，不会一签就消失。

## 已准备好的文件

- `.github/workflows/signpath-release.yml`：在 GitHub 托管的 Windows runner 上构建安装包，上传未签名产物，提交 SignPath 签名，下载并校验签名。
- `.signpath/artifact-configurations/installer.xml`：定义只签安装包里的 Setup exe。
- `ci/dsh-runtime/package.json`、`ci/dsh-runtime/pnpm-workspace.yaml`：在 CI 里用 pnpm 还原 DSH 运行时，替代本地 `reference/dsh-runtime`。
- `CODE_SIGNING_POLICY.md`、`README.md` 的代码签名段落：申请要求公开的签名策略。

## 申请前还需要

1. 一个 OSI 许可证文件（例如 MIT 或 Apache-2.0）。仓库目前没有 LICENSE。
2. 仓库保持公开，默认分支是 `master`。
3. GitHub 和 SignPath 账号都开启 MFA。

## 申请

1. 打开 https://signpath.org/apply 。
2. 填仓库地址 `https://github.com/xbx787/whale-companion`、许可证、项目说明。
3. 说明签名对象是 NSIS 安装包，构建在 GitHub Actions 上完成。
4. 等待审核，通常 1–2 周。

## 通过后配置

在 SignPath 后台：

1. 记下组织 ID（UUID）。
2. 项目 slug。
3. 签名策略 slug，一般是 `release-signing`。
4. 新建 Artifact Configuration，slug 用 `installer`，导入 `.signpath/artifact-configurations/installer.xml`。
5. 在 Trusted Build Systems 里把 GitHub.com 链接到项目。
6. 安装 SignPath GitHub App，只授权这个仓库。
7. 在 Users and Groups → CI builds 生成 API token。

在 GitHub 仓库设置：

- Secret：`SIGNPATH_API_TOKEN`
- Variables：`SIGNPATH_ORGANIZATION_ID`、`SIGNPATH_PROJECT_SLUG`、`SIGNPATH_SIGNING_POLICY_SLUG`、`SIGNPATH_ARTIFACT_CONFIGURATION_SLUG`（填 `installer`）

## 运行

1. Actions → Signed release → Run workflow，填版本号，勾选签名。
2. 构建完成后，SignPath 后台会收到签名请求，需要项目批准人手动批准。
3. 工作流等待签名完成，用 `Get-AuthenticodeSignature` 校验，然后上传 `signed-installer` artifact。

## 校验

下载签名后的安装包：

```powershell
Get-AuthenticodeSignature '小鲸 Setup x.y.z.exe' | Format-List Status, SignerCertificate
```

`Status` 应为 `Valid`，签名者应显示 SignPath Foundation。
