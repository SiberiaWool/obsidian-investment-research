import { CompanyInfo, KeyDriver, DisagreementPoint, TodoItem } from '../types';

export class TemplateEngine {
	private author: string;

	constructor(author: string = '分析师') {
		this.author = author;
	}

	/**
	 * 更新作者名称
	 */
	setAuthor(author: string): void {
		this.author = author;
	}

	/**
	 * 渲染关键驱动因素跟踪模板
	 */
	renderKeyDrivers(companyInfo: CompanyInfo, drivers: KeyDriver[] = []): string {
		const date = new Date().toISOString().split('T')[0];

		let content = `# ${companyInfo.name} 关键驱动因素跟踪

> 最后更新：${date}

## 核心驱动因素

| 驱动因素 | 当前状态 | 历史变化 | 影响程度 | 更新时间 |
|---------|---------|---------|---------|----------|
`;

		if (drivers.length > 0) {
			for (const driver of drivers) {
				const impact = ['低', '中', '高', '极高'][Math.min(driver.impact - 1, 3)];
				content += `| ${driver.name} | ${driver.currentStatus} | ${driver.historicalChange} | ${impact} | ${driver.lastUpdated} |\n`;
			}
		} else {
			content += `| *待添加* | *待添加* | *待添加* | *待添加* | *待添加* |\n`;
		}

		content += `
## 数据跟踪

### 价格跟踪
| 时间 | 批价 | 零售价 | 库存天数 | 备注 |
|------|------|-------|---------|------|
| ${date} | - | - | - | 初始记录 |

### 关键指标
| 指标 | 最新值 | 环比变化 | 同比变化 | 数据来源 |
|------|-------|---------|---------|---------|
| - | - | - | - | - |

## 更新来源
> 记录最新的调研纪要、公告、新闻等信息来源

### 最近更新
- *暂无更新记录*
`;

		return content;
	}

	/**
	 * 渲染市场分歧点模板
	 */
	renderDisagreements(companyInfo: CompanyInfo, disagreements: DisagreementPoint[] = []): string {
		const date = new Date().toISOString().split('T')[0];

		let content = `# ${companyInfo.name} 市场核心分歧点

> 最后更新：${date}

> 本文档记录市场对该公司的核心分歧点，帮助识别投资机会和风险。
`;

		if (disagreements.length > 0) {
			disagreements.forEach((disagreement, index) => {
				content += `\n## 分歧点 ${index + 1}：${disagreement.title}\n\n`;
				content += `### 看多观点\n`;
				disagreement.bullishView.points.forEach(point => {
					content += `- ${point}\n`;
				});
				if (disagreement.bullishView.sources.length > 0) {
					content += `\n**依据**：\n`;
					disagreement.bullishView.sources.forEach(source => {
						content += `  - [${source}](${source})\n`;
					});
				}

				content += `\n### 看空观点\n`;
				disagreement.bearishView.points.forEach(point => {
					content += `- ${point}\n`;
				});
				if (disagreement.bearishView.sources.length > 0) {
					content += `\n**依据**：\n`;
					disagreement.bearishView.sources.forEach(source => {
						content += `  - [${source}](${source})\n`;
					});
				}

				content += `\n### 我们的观点\n`;
				content += `- **置信度**：${['低', '中', '高', '极高'][Math.min(disagreement.ourView.confidence - 1, 3)]}\n`;
				content += `- **核心逻辑**：${disagreement.ourView.logic}\n`;
				if (disagreement.ourView.needToVerify.length > 0) {
					content += `- **待验证指标**：\n`;
					disagreement.ourView.needToVerify.forEach(item => {
						content += `  - [ ] ${item}\n`;
					});
				}
				content += `\n---\n\n`;
			});
		} else {
			content += `
## 分歧点 1：待添加标题

### 看多观点
- 观点1
- 观点2

### 看空观点
- 观点1
- 观点2

### 我们的观点
- **置信度**：中
- **核心逻辑**：请在此处填写核心观点
- **待验证指标**：
  - [ ] 验证指标1
  - [ ] 验证指标2

---

## 分歧点 2：待添加标题

（同上格式添加更多分歧点）
`;
		}

		content += `
## 分歧演变历史
| 日期 | 分歧点 | 观点变化 | 验证结果 |
|------|-------|---------|---------|
| ${date} | - | 初始记录 | 待验证 |
`;

		return content;
	}

	/**
	 * 渲染研究任务清单模板
	 */
	renderTodoList(companyInfo: CompanyInfo, todos: TodoItem[] = []): string {
		const date = new Date().toISOString().split('T')[0];

		let content = `# ${companyInfo.name} 研究任务清单

> 最后更新：${date}

> 本文档记录需要深入研究的问题和任务，帮助跟踪研究进度。
`;

		// 按优先级分组
		const highPriority = todos.filter(t => t.priority === 'high');
		const mediumPriority = todos.filter(t => t.priority === 'medium');
		const lowPriority = todos.filter(t => t.priority === 'low');

		content += `\n## 高优先级\n`;
		if (highPriority.length > 0) {
			highPriority.forEach(todo => {
				const checkbox = todo.completed ? '- [x]' : '- [ ]';
				const deadline = todo.deadline ? `（截止：${todo.deadline}）` : '';
				content += `${checkbox} ${todo.task}${deadline}\n`;
			});
		} else {
			content += `- [ ] 待添加高优先级任务\n`;
		}

		content += `\n## 中优先级\n`;
		if (mediumPriority.length > 0) {
			mediumPriority.forEach(todo => {
				const checkbox = todo.completed ? '- [x]' : '- [ ]';
				const deadline = todo.deadline ? `（截止：${todo.deadline}）` : '';
				content += `${checkbox} ${todo.task}${deadline}\n`;
			});
		} else {
			content += `- [ ] 待添加中优先级任务\n`;
		}

		content += `\n## 低优先级\n`;
		if (lowPriority.length > 0) {
			lowPriority.forEach(todo => {
				const checkbox = todo.completed ? '- [x]' : '- [ ]';
				const deadline = todo.deadline ? `（截止：${todo.deadline}）` : '';
				content += `${checkbox} ${todo.task}${deadline}\n`;
			});
		} else {
			content += `- [ ] 待添加低优先级任务\n`;
		}

		const completedCount = todos.filter(t => t.completed).length;
		const totalCount = todos.length;
		const completionRate = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;

		content += `
## 任务统计
- 总任务数：${totalCount}
- 已完成：${completedCount}
- 待完成：${totalCount - completedCount}
- 完成率：${completionRate}%

## 最近完成
> 记录最近完成的任务和关键发现

- ${date} 初始化任务清单
`;

		return content;
	}

	/**
	 * 渲染调研纪要模板
	 */
	renderMeetingTemplate(): string {
		const date = new Date().toISOString().split('T')[0];
		const datetime = new Date().toLocaleString('zh-CN');

		return `---
title: "调研纪要标题"
date: ${date}
type: 纪要
industry: ""
companies: []
tags: []
summary: ""
author: ${this.author}
created: ${datetime}
modified: ${datetime}
status: 进行中
---

# 调研纪要标题

## 基本信息
- **时间**：${datetime}
- **地点**：
- **参与人员**：
- **公司**：
- **调研对象**：

## 核心观点
>
> 用2-3句话总结本次调研的核心观点和投资影响
>

## 详细内容

### 1. 经营情况
-

### 2. 行业趋势
-

### 3. 竞争格局
-

### 4. 风险因素
-

## 关键数据
| 指标 | 数据 | 备注 |
|------|------|------|
| - | - | - |

## 投资影响
- **评级**：
- **目标价**：
- **核心逻辑**：

## 待验证事项
- [ ] 事项1
- [ ] 事项2

## 相关文档
-
`;
	}

	/**
	 * 渲染行业研究模板
	 */
	renderIndustryTemplate(): string {
		const date = new Date().toISOString().split('T')[0];

		return `---
title: "行业研究标题"
date: ${date}
type: 研报
industry: ""
tags: []
summary: ""
author: ${this.author}
created: ${date}
modified: ${date}
status: 进行中
---

# 行业研究标题

## 行业概况
-

## 市场规模与增长
-

## 竞争格局
-

## 关键驱动因素
-

## 主要风险
-

## 投资机会
-

## 相关公司
-
`;
	}
}
