import { App, TFile, TAbstractFile, TFolder, MetadataCache } from 'obsidian';
import { DocumentMetadata } from '../types';
import { InvestmentResearchSettings } from '../types';

export class LinkManager {
	constructor(
		private app: App,
		private settings: InvestmentResearchSettings,
		private metadataCache: MetadataCache
	) {}

	/**
	 * 为文档自动创建关联链接
	 */
	async createRelatedLinks(file: TFile): Promise<void> {
		const metadata = this.extractMetadata(file);
		if (!metadata) return;

		const relatedDocs: TFile[] = [];

		// 1. 根据公司名称查找相关文档
		if (metadata.companies && metadata.companies.length > 0) {
			for (const company of metadata.companies) {
				const docs = await this.findDocumentsByCompany(company);
				relatedDocs.push(...docs.filter(f => f.path !== file.path));
			}
		}

		// 2. 根据板块查找相关文档
		if (metadata.sectors && metadata.sectors.length > 0) {
			for (const sector of metadata.sectors) {
				const docs = await this.findDocumentsBySector(sector);
				relatedDocs.push(...docs.filter(f => f.path !== file.path));
			}
		}

		// 3. 根据标签查找相关文档
		if (metadata.tags && metadata.tags.length > 0) {
			for (const tag of metadata.tags) {
				const docs = await this.findDocumentsByTag(tag);
				relatedDocs.push(...docs.filter(f => f.path !== file.path));
			}
		}

		// 去重并排序
		const uniqueDocs = Array.from(new Set(relatedDocs));

		if (uniqueDocs.length === 0) return;

		// 在文档末尾添加关联链接
		await this.appendRelatedLinks(file, uniqueDocs);
	}

	/**
	 * 查找包含特定公司的文档
	 */
	async findDocumentsByCompany(companyName: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const matched: TFile[] = [];

		for (const file of files) {
			const metadata = this.extractMetadata(file);
			if (metadata && metadata.companies && metadata.companies.includes(companyName)) {
				matched.push(file);
			}
		}

		return matched;
	}

	/**
	 * 查找包含特定板块的文档
	 */
	async findDocumentsBySector(sectorName: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const matched: TFile[] = [];

		for (const file of files) {
			const metadata = this.extractMetadata(file);
			if (metadata && metadata.sectors && metadata.sectors.includes(sectorName)) {
				matched.push(file);
			}
		}

		return matched;
	}

	/**
	 * 查找包含特定标签的文档
	 */
	async findDocumentsByTag(tag: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const matched: TFile[] = [];

		for (const file of files) {
			const metadata = this.extractMetadata(file);
			if (metadata && metadata.tags && metadata.tags.some(t => t.includes(tag))) {
				matched.push(file);
			}
		}

		return matched;
	}

	/**
	 * 根据日期查找复盘文档
	 */
	async findReviewByDate(date: string, type: 'daily' | 'weekly' | 'topic'): Promise<TFile | null> {
		let folderPath: string;
		let prefix: string;

		switch (type) {
			case 'daily':
				folderPath = this.settings.folderStructure.dailyReviewPath;
				prefix = '日度复盘_';
				break;
			case 'weekly':
				folderPath = this.settings.folderStructure.weeklyReviewPath;
				prefix = '周度复盘_';
				break;
			case 'topic':
				folderPath = this.settings.folderStructure.topicReviewPath;
				prefix = '专题复盘_';
				break;
		}

		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder instanceof TFolder)) return null;

		const targetFileName = `${prefix}${date}.md`;
		const file = folder.children.find((f: TAbstractFile) => f.name === targetFileName);

		return file instanceof TFile ? file : null;
	}

	/**
	 * 创建从复盘到个股研究的链接
	 */
	async linkReviewToStocks(reviewFile: TFile, stockCodes: string[]): Promise<void> {
		const links: string[] = [];

		for (const code of stockCodes) {
			const stockFile = await this.findStockFile(code);
			if (stockFile) {
				links.push(`[[${stockFile.path}]]`);
			}
		}

		if (links.length > 0) {
			const content = await this.app.vault.read(reviewFile);
			const linkSection = `\n## 相关个股研究\n\n${links.join('\n')}\n`;
			await this.app.vault.modify(reviewFile, content + linkSection);
		}
	}

	/**
	 * 查找个股研究文件
	 */
	async findStockFile(stockCode: string): Promise<TFile | null> {
		const paths = [
			this.settings.folderStructure.stockRecentCorePath,
			this.settings.folderStructure.stockLongTermPath,
			this.settings.folderStructure.stockOtherPath,
		];

		for (const path of paths) {
			const folder = this.app.vault.getAbstractFileByPath(path);
			if (folder instanceof TFolder && folder.children) {
				const file = Array.from(folder.children).find((f: TAbstractFile) =>
					f.name.startsWith(`${stockCode}_`) || f.name.includes(stockCode)
				);
				if (file instanceof TFile) return file;
			}
		}

		return null;
	}

	/**
	 * 在文档末尾添加关联链接
	 */
	private async appendRelatedLinks(file: TFile, relatedFiles: TFile[]): Promise<void> {
		const content = await this.app.vault.read(file);

		const linksSection = `
## 关联文档

${relatedFiles.map(f => {
	const metadata = this.extractMetadata(f);
	const type = metadata?.type || '文档';
	const date = metadata?.date || '';
	return `- [[${f.path}|${metadata?.title || f.basename}]] (${type}${date ? ' - ' + date : ''})`;
}).join('\n')}
`;

		// 检查是否已有关联文档部分
		if (content.includes('## 关联文档')) {
			// 替换现有部分
			const newContent = content.replace(
				/## 关联文档[\s\S]*$/,
				linksSection.trim()
			);
			await this.app.vault.modify(file, newContent);
		} else {
			// 添加到末尾
			await this.app.vault.modify(file, content + '\n' + linksSection);
		}
	}

	/**
	 * 从文件提取元数据
	 */
	private extractMetadata(file: TFile): DocumentMetadata | null {
		const cache = this.metadataCache.getFileCache(file);
		if (!cache || !cache.frontmatter) return null;

		const frontmatter = cache.frontmatter;

		return {
			title: frontmatter.title || file.basename,
			date: frontmatter.date || '',
			type: frontmatter.type || '笔记',
			industry: frontmatter.industry,
			companies: frontmatter.companies || [],
			sectors: frontmatter.sectors || [],
			tags: frontmatter.tags || [],
			summary: frontmatter.summary,
			author: frontmatter.author || '',
			created: frontmatter.created || '',
			modified: frontmatter.modified || '',
			status: frontmatter.status || '进行中',
		};
	}
}
