import { App, TFile, TFolder, Notice } from 'obsidian';
import { InvestmentResearchSettings, CompanyInfo } from '../types';

export class FileManager {
	constructor(private app: App, private settings: InvestmentResearchSettings) {}

	/**
	 * 创建文件夹（如果不存在）
	 */
	async ensureFolder(path: string): Promise<TFolder> {
		const folder = this.app.vault.getAbstractFileByPath(path);

		if (folder instanceof TFolder) {
			return folder;
		}

		if (folder) {
			throw new Error(`路径 ${path} 已存在但不是文件夹`);
		}

		await this.app.vault.createFolder(path);
		new Notice(`Folder created: ${path}`);
		return this.app.vault.getAbstractFileByPath(path) as TFolder;
	}

	/**
	 * 初始化整个文件夹结构
	 */
	async initializeFolderStructure(): Promise<void> {
		const { folderStructure } = this.settings;

		// 创建复盘文件夹
		await this.ensureFolder(folderStructure.dailyReviewPath);
		await this.ensureFolder(folderStructure.weeklyReviewPath);
		await this.ensureFolder(folderStructure.topicReviewPath);

		// 创建研究文件夹
		await this.ensureFolder(folderStructure.sectorResearchPath);
		await this.ensureFolder(folderStructure.stockRecentCorePath);
		await this.ensureFolder(folderStructure.stockLongTermPath);
		await this.ensureFolder(folderStructure.stockOtherPath);
		await this.ensureFolder(folderStructure.commodityResearchPath);

		// 创建其他文件夹
		await this.ensureFolder(folderStructure.resourcesPath);
		await this.ensureFolder(folderStructure.archivePath);

		new Notice('投研知识库结构初始化完成');
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
