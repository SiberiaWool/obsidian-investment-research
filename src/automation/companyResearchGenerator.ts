import { App, Notice, TFolder } from 'obsidian';
import { FileManager } from '../core/fileManager';
import { MetadataManager } from '../core/metadataManager';
import { TemplateEngine } from '../core/templateEngine';
import { CompanyInfo } from '../types';

export class CompanyResearchGenerator {
	private fileManager: FileManager;
	private metadataManager: MetadataManager;
	private templateEngine: TemplateEngine;

	constructor(private app: App, private settings: any, templateEngine: TemplateEngine) {
		this.fileManager = new FileManager(app, settings);
		this.metadataManager = new MetadataManager(app);
		this.templateEngine = templateEngine;
	}

	/**
	 * 完整创建公司研究文件夹及其内容
	 */
	async createCompanyResearch(companyInfo: CompanyInfo): Promise<TFolder> {
		try {
			// 1. 创建公司文件夹
			const companyFolder = await this.fileManager.createCompanyFolder(companyInfo);

			// 2. 创建关键驱动因素跟踪.md
			await this.createKeyDriversFile(companyFolder, companyInfo);

			// 3. 创建市场核心分歧点.md
			await this.createDisagreementsFile(companyFolder, companyInfo);

			// 4. 创建研究任务清单.md
			await this.createTodoListFile(companyFolder, companyInfo);

			// 5. 创建相关文档链接.md
			await this.createRelatedDocsFile(companyFolder, companyInfo);

			new Notice(`${companyInfo.name} 研究文件夹创建成功`);
			return companyFolder;

		} catch (error) {
			new Notice(`创建公司研究文件夹失败: ${error.message}`);
			throw error;
		}
	}

	/**
	 * 创建关键驱动因素文件
	 */
	private async createKeyDriversFile(folder: TFolder, companyInfo: CompanyInfo): Promise<void> {
		const content = this.templateEngine.renderKeyDrivers(companyInfo);
		const file = await this.fileManager.createFileFromTemplate(
			folder,
			'关键驱动因素跟踪.md',
			content
		);

		// 添加元数据
		await this.metadataManager.addInitialMetadata(file, {
			title: `${companyInfo.name} 关键驱动因素跟踪`,
			type: '笔记',
			industry: companyInfo.industry,
			companies: [companyInfo.name],
			tags: [`公司/${companyInfo.name}`, `行业/${companyInfo.industry}`, `类型/跟踪`],
		});
	}

	/**
	 * 创建市场分歧点文件
	 */
	private async createDisagreementsFile(folder: TFolder, companyInfo: CompanyInfo): Promise<void> {
		const content = this.templateEngine.renderDisagreements(companyInfo);
		const file = await this.fileManager.createFileFromTemplate(
			folder,
			'市场核心分歧点.md',
			content
		);

		// 添加元数据
		await this.metadataManager.addInitialMetadata(file, {
			title: `${companyInfo.name} 市场核心分歧点`,
			type: '笔记',
			industry: companyInfo.industry,
			companies: [companyInfo.name],
			tags: [`公司/${companyInfo.name}`, `行业/${companyInfo.industry}`, `类型/分歧点`],
		});
	}

	/**
	 * 创建研究任务清单文件
	 */
	private async createTodoListFile(folder: TFolder, companyInfo: CompanyInfo): Promise<void> {
		const content = this.templateEngine.renderTodoList(companyInfo);
		const file = await this.fileManager.createFileFromTemplate(
			folder,
			'研究任务清单.md',
			content
		);

		// 添加元数据
		await this.metadataManager.addInitialMetadata(file, {
			title: `${companyInfo.name} 研究任务清单`,
			type: '笔记',
			industry: companyInfo.industry,
			companies: [companyInfo.name],
			tags: [`公司/${companyInfo.name}`, `行业/${companyInfo.industry}`, `类型/任务`],
		});
	}

	/**
	 * 创建相关文档链接文件
	 */
	private async createRelatedDocsFile(folder: TFolder, companyInfo: CompanyInfo): Promise<void> {
		const content = `# ${companyInfo.name} 相关文档链接

> 本文档自动关联与${companyInfo.name}相关的所有文档

## 同行业公司
> 自动链接同行业的其他公司研究文件夹

## 行业研究
> 自动链接行业研究文档

## 概念主题
> 自动链接相关概念主题

## 调研纪要
> 自动链接所有调研纪要

## 公告资料
> 自动链接所有公告资料
`;

		const file = await this.fileManager.createFileFromTemplate(
			folder,
			'相关文档链接.md',
			content
		);

		// 添加元数据
		await this.metadataManager.addInitialMetadata(file, {
			title: `${companyInfo.name} 相关文档链接`,
			type: '笔记',
			industry: companyInfo.industry,
			companies: [companyInfo.name],
			tags: [`公司/${companyInfo.name}`, `行业/${companyInfo.industry}`, `类型/链接`],
		});
	}

	/**
	 * 检查公司研究文件夹是否已存在
	 */
	exists(companyCode: string): boolean {
		return this.fileManager.findCompanyFolder(companyCode) !== null;
	}
}
