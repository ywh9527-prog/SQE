# Superpowers Workflow Configuration

## 概述

这是 Superpowers 技能库的 iFlow CLI 工作流配置，提供了一套完整的软件开发工作流程和最佳实践。

## 资源加载策略

当需要引用指令中提到的资源时：
- 在 `.iflow` 文件夹中查找文件
- 格式始终是带点前缀的完整路径（例如 `.iflow/agents/tdd-agent.md`, `.iflow/commands/tdd.md`）
- 如果指定了章节（例如 `{root}/tasks/create-story.md#section-name`），导航到文件中的该章节

### 资源路径映射

- `agents: <agent-name>` → 查找 `.iflow/agents/<agent-name>.md`
- `commands: <command-name>` → 查找 `.iflow/commands/<command-name>.md`
- `tasks: <task-name>` → 查找 `.iflow/tasks/<task-name>.md`
- `templates: <template-name>` → 查找 `.iflow/templates/<template-name>.md`

## 可用技能

### 设计与规划
- **brainstorming** - 创意头脑风暴，在开始任何创造性工作前使用
- **writing-plans** - 编写详细实施计划
- **using-git-worktrees** - 创建独立Git工作空间

### 开发执行
- **subagent-driven-development** - 子代理驱动开发
- **executing-plans** - 批量执行计划
- **test-driven-development** - 测试驱动开发（TDD）

### 质量保证
- **systematic-debugging** - 系统化调试
- **verification-before-completion** - 完成前验证
- **requesting-code-review** - 请求代码审查
- **receiving-code-review** - 接收代码审查

### 协作与优化
- **dispatching-parallel-agents** - 并行任务调度
- **finishing-a-development-branch** - 完成开发分支
- **using-superpowers** - Superpowers使用指南
- **writing-skills** - 创建新技能

## 斜杠命令

使用以下斜杠命令直接调用技能：

- `/brainstorming` - 启动头脑风暴
- `/tdd` 或 `/test-driven-development` - 启动TDD开发
- `/debug` 或 `/systematic-debugging` - 启动系统化调试
- `/plan` 或 `/writing-plans` - 编写实施计划
- `/git-worktree` 或 `/using-git-worktrees` - 创建Git工作树
- `/code-review` 或 `/requesting-code-review` - 请求代码审查
- `/verify` 或 `/verification-before-completion` - 完成前验证
- `/subagent` 或 `/subagent-driven-development` - 子代理驱动开发
- `/execute` 或 `/executing-plans` - 执行计划
- `/parallel` 或 `/dispatching-parallel-agents` - 并行任务调度
- `/finish` 或 `/finishing-a-development-branch` - 完成开发分支
- `/write-skill` 或 `/writing-skills` - 创建新技能
- `/superpowers` 或 `/using-superpowers` - Superpowers使用指南

## 工作流程

Superpowers 遵循以下标准开发流程：

1. **需求澄清** - 使用 brainstorming 技能
2. **设计规划** - 使用 writing-plans 技能
3. **环境准备** - 使用 using-git-worktrees 技能
4. **任务执行** - 使用 subagent-driven-development 或 executing-plans 技能
5. **质量保证** - 使用 test-driven-development 和 systematic-debugging 技能
6. **代码审查** - 使用 requesting-code-review 技能
7. **完成验证** - 使用 verification-before-completion 技能
8. **分支管理** - 使用 finishing-a-development-branch 技能

## 核心原则

- **测试驱动** - 始终先写测试，再写实现
- **系统化方法** - 使用经过验证的流程而非猜测
- **简化复杂度** - 简单性是主要目标
- **证据胜于声明** - 在声明成功前进行验证

## 技能触发

技能会根据上下文自动触发，也可以通过斜杠命令明确调用。每个技能都有明确的触发条件和使用场景。

## 相关资源

- Superpowers 项目：https://github.com/obra/superpowers
- 技能文档：`C:\Users\Administrator\.iflow\skills\<skill-name>\SKILL.md`