## 改了什么

<!-- 一句话说明这次改动解决的问题，以及为什么现在做。 -->

## 怎么验证

- [ ] `npm run check`
- [ ] 相关测试：`npx vitest run test/<file>.test.ts`
- [ ] 打包与自检：`powershell -File scripts/evolve.ps1`

## 影响范围

<!-- 涉及审批模式、打包、重启、内核补丁或 Live2D 时写清楚；没有就删掉这一节。 -->

## 截图或日志

<!-- UI 改动请附截图；崩溃请附 data/self-test/ 或 .tmp/ 下的日志。 -->

## 检查清单

- [ ] 没有改动本分支不允许碰的 Live2D 文件
- [ ] 新增设置项已接通 contracts、store、IPC 白名单和设置页
- [ ] 界面文案没有使用间隔号「·」
- [ ] 临时文件只放在 `.tmp/`，没有留在项目根目录
