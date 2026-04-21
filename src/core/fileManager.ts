import { App, TFile, TFolder, Notice, normalizePath } from 'obsidian';
import { InvestmentResearchSettings, CompanyInfo } from '../types';

export class FileManager {
	// 模板常量
	private static readonly DAILY_REVIEW_TEMPLATE = `## **市场回顾**【{{date}}】

|           |     |          |     |          |     |          |     |
| --------- | --- | -------- | --- | -------- | --- | -------- | --- |
| **万得全A**  |     | **上证**   |     | **科创50** |     | **日均成交** |     |
| **沪深300** |     | **上证50** |     | **创业板**  |     | **成交趋势** |     |


### **热门标签**（通达信）
**涨幅靠前**：
1. 逻辑

**跌幅靠前**：
1. 逻辑


## **市场观点**


## **重点板块跟踪**
1. **板块1**
    1. **基本观点**
        1.
    2. **参与标的**
        1. xxx
            1. 操作&收益情况
            2. 逻辑
    3. **储备标的**
2. **板块2**
    1. **基本观点**
    2. **参与标的**
    3. **储备标的**
`;

	private static readonly WEEKLY_REVIEW_TEMPLATE = `## {{date}}

## 市场复盘
### **重点指数**

| **万得全A**  |     | **上证**   |     | **科创50** |     | **两市成交** |     |
| --------- | --- | -------- | --- | -------- | --- | -------- | --- |
| **沪深300** |     | **上证50** |     | **创业板**  |     | **成交趋势** |     |

### 情绪指标

| **上涨家数** |     | **下跌家数** |     | **连板&高度** | &   | **打板资金** | 亿   |
| -------- | --- | -------- | --- | --------- | --- | -------- | --- |
| **涨停**   |     | **跌停板**  |     | **大幅回撤**  |     |          |     |

### **高标/连板/强趋势筛选**

|     | 连板   |      |      |      |      |      |     |
| --- | ---- | ---- | ---- | ---- | ---- | ---- | --- |

_跌停剔除ST和未开板新股_
### 板块表现
1. **涨幅较大**：
2. **跌幅较大**：
3. **负反馈板块**：
4. **高标板块**：
5. **最强板块？最强龙头？是否可持续？**
6. **前期强势今日演绎**
### 大盘点评

### 结构及思考
1. **大盘阶段定性，情绪定性**
2. **核心板块节点位置，是否高潮过，主线题材还是支线题材，可能因为什么高潮，可能因为什么大跌**
3. **哪里赚钱效应好**
5. **龙虎榜动向**
6. **昨日观点回顾**
7. **重点关注板块**

### 逻辑筛选 / 选股
1. **新闻催化中潜在轮动到这个方向**
2. **重点公告**
3. **盘面筛选**
4. **低位首板筛选**
`;

	constructor(private app: App, private settings: InvestmentResearchSettings) {}

	/**
	 * 创建文件夹（如果不存在）
	 */
	async ensureFolder(path: string): Promise<TFolder> {
		const normalizedPath = normalizePath(path);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (folder instanceof TFolder) {
			return folder;
		}

		if (folder) {
			throw new Error(`路径 ${normalizedPath} 已存在但不是文件夹`);
		}

		await this.app.vault.createFolder(normalizedPath);
		return this.app.vault.getAbstractFileByPath(normalizedPath) as TFolder;
	}

	/**
	 * 初始化整个文件夹结构
	 */
	async initializeFolderStructure(): Promise<void> {
		const { folderStructure } = this.settings;

		// 并行创建所有文件夹
		await Promise.all([
			this.ensureFolder(folderStructure.dailyReviewPath),
			this.ensureFolder(folderStructure.weeklyReviewPath),
			this.ensureFolder(folderStructure.topicReviewPath),
			this.ensureFolder(folderStructure.sectorResearchPath),
			this.ensureFolder(folderStructure.stockRecentCorePath),
			this.ensureFolder(folderStructure.stockLongTermPath),
			this.ensureFolder(folderStructure.stockOtherPath),
			this.ensureFolder(folderStructure.commodityResearchPath),
			this.ensureFolder(folderStructure.resourcesPath),
			this.ensureFolder(folderStructure.archivePath),
		]);

		// 初始化默认模板文件（依赖文件夹创建完成）
		await this.initializeTemplates();

		new Notice('投研知识库结构初始化完成');
	}

	/**
	 * 初始化默认模板文件
	 */
	async initializeTemplates(): Promise<void> {
		try {
			const templatesPath = this.settings.folderStructure.templatesPath;
			await this.ensureFolder(templatesPath);

			const dailyTemplatePath = normalizePath(`${templatesPath}/日复盘.md`);
			const weeklyTemplatePath = normalizePath(`${templatesPath}/周复盘.md`);

			// 并行检查文件存在性
			const [dailyExists, weeklyExists] = await Promise.all([
				Promise.resolve(this.app.vault.getAbstractFileByPath(dailyTemplatePath)),
				Promise.resolve(this.app.vault.getAbstractFileByPath(weeklyTemplatePath)),
			]);

			const creations: Promise<void>[] = [];
			const createdTemplates: string[] = [];

			// 使用 try-catch 直接创建，避免 TOCTOU 问题
			if (!dailyExists) {
				creations.push(
					this.app.vault.create(dailyTemplatePath, FileManager.DAILY_REVIEW_TEMPLATE)
						.then(() => {
							createdTemplates.push('日复盘.md');
						})
						.catch((error) => {
							// 文件已存在或其他错误，静默处理
							if (!(error as Error).message?.includes('already exists')) {
								throw error;
							}
						})
				);
			}

			if (!weeklyExists) {
				creations.push(
					this.app.vault.create(weeklyTemplatePath, FileManager.WEEKLY_REVIEW_TEMPLATE)
						.then(() => {
							createdTemplates.push('周复盘.md');
						})
						.catch((error) => {
							// 文件已存在或其他错误，静默处理
							if (!(error as Error).message?.includes('already exists')) {
								throw error;
							}
						})
				);
			}

			await Promise.all(creations);

			// 合并通知
			if (createdTemplates.length > 0) {
				new Notice(`已创建默认模板：${createdTemplates.join(', ')}`);
			}
		} catch (error) {
			new Notice(`模板初始化失败: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 创建公司研究文件夹
	 */
	async createCompanyFolder(companyInfo: CompanyInfo): Promise<TFolder> {
		let folderPath: string;

		// 根据category选择路径
		switch (companyInfo.category) {
			case '近期核心':
				folderPath = `${this.settings.folderStructure.stockRecentCorePath}/${companyInfo.code}_${companyInfo.name}`;
				break;
			case '长期跟踪':
				folderPath = `${this.settings.folderStructure.stockLongTermPath}/${companyInfo.code}_${companyInfo.name}`;
				break;
			case '其他覆盖':
				folderPath = `${this.settings.folderStructure.stockOtherPath}/${companyInfo.code}_${companyInfo.name}`;
				break;
			default:
				folderPath = `${this.settings.folderStructure.stockRecentCorePath}/${companyInfo.code}_${companyInfo.name}`;
		}

		// 创建主文件夹
		const companyFolder = await this.ensureFolder(folderPath);

		// 创建子文件夹
		await this.ensureFolder(`${folderPath}/调研纪要`);
		await this.ensureFolder(`${folderPath}/公告资料`);
		await this.ensureFolder(`${folderPath}/财务数据`);

		new Notice(`已创建公司研究文件夹：${companyInfo.name}`);

		return companyFolder;
	}

	/**
	 * 创建文件（带模板内容）
	 */
	async createFileFromTemplate(
		folder: TFolder,
		filename: string,
		content: string
	): Promise<TFile> {
		const filePath = `${folder.path}/${filename}`;

		// 检查文件是否已存在
		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (existing instanceof TFile) {
			new Notice(`文件 ${filename} 已存在`);
			return existing;
		}

		const file = await this.app.vault.create(filePath, content);
		return file;
	}

	/**
	 * 读取文件内容
	 */
	async readFile(file: TFile): Promise<string> {
		return await this.app.vault.read(file);
	}

	/**
	 * 写入文件内容
	 */
	async writeFile(file: TFile, content: string): Promise<void> {
		await this.app.vault.modify(file, content);
	}

	/**
	 * 在文件开头添加内容
	 */
	async prependToFile(file: TFile, content: string): Promise<void> {
		const existingContent = await this.readFile(file);
		const newContent = content + '\n\n' + existingContent;
		await this.writeFile(file, newContent);
	}

	/**
	 * 在文件末尾添加内容
	 */
	async appendToFile(file: TFile, content: string): Promise<void> {
		const existingContent = await this.readFile(file);
		const newContent = existingContent + '\n\n' + content;
		await this.writeFile(file, newContent);
	}

	/**
	 * 获取文件夹中的所有Markdown文件
	 */
	getMarkdownFilesInFolder(folder: TFolder): TFile[] {
		const files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				files.push(child);
			}
			if (child instanceof TFolder) {
				files.push(...this.getMarkdownFilesInFolder(child));
			}
		}

		return files;
	}

	/**
	 * 根据股票代码查找公司文件夹
	 */
	findCompanyFolder(code: string): TFolder | null {
		const paths = [
			this.settings.folderStructure.stockRecentCorePath,
			this.settings.folderStructure.stockLongTermPath,
			this.settings.folderStructure.stockOtherPath,
		];

		for (const path of paths) {
			const folder = this.app.vault.getAbstractFileByPath(path);
			if (folder instanceof TFolder) {
				for (const child of folder.children) {
					if (child instanceof TFolder && child.name.startsWith(code)) {
						return child;
					}
				}
			}
		}

		return null;
	}

	/**
	 * 搜索包含特定标签的文件
	 */
	async findFilesByTag(tag: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const matchedFiles: TFile[] = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const tags = cache?.frontmatter?.tags;

			if (tags) {
				const tagArray = Array.isArray(tags) ? tags : [tags];
				if (tagArray.some((t: string) => t.includes(tag))) {
					matchedFiles.push(file);
				}
			}
		}

		return matchedFiles;
	}
}
