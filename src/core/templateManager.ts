import { App, TFile } from 'obsidian';
import { InvestmentResearchSettings } from '../types';

export class TemplateManager {
	private templateCache: Map<string, string> = new Map();

	constructor(private app: App, private settings: InvestmentResearchSettings) {}

	/**
	 * 获取模板内容
	 */
	async getTemplate(templateName: string): Promise<string> {
		// 检查缓存
		if (this.templateCache.has(templateName)) {
			return this.templateCache.get(templateName)!;
		}

		// 从templates文件夹读取
		const templatePath = `${this.settings.folderStructure.templatesPath}/${templateName}`;
		const templateFile = this.app.vault.getAbstractFileByPath(templatePath);

		if (!(templateFile instanceof TFile)) {
			throw new Error(`模板文件不存在: ${templateName}`);
		}

		const content = await this.app.vault.read(templateFile);

		// 缓存模板
		this.templateCache.set(templateName, content);

		return content;
	}

	/**
	 * 使用模板创建文档，支持变量替换
	 */
	async renderTemplate(templateName: string, variables: Record<string, any> = {}): Promise<string> {
		let content = await this.getTemplate(templateName);

		// 替换变量
		for (const [key, value] of Object.entries(variables)) {
			const placeholder = `{{${key}}}`;
			content = content.replace(new RegExp(placeholder, 'g'), String(value));
		}

		return content;
	}

	/**
	 * 清除模板缓存
	 */
	clearCache(): void {
		this.templateCache.clear();
	}

	/**
	 * 重新加载指定模板
	 */
	async reloadTemplate(templateName: string): Promise<void> {
		this.templateCache.delete(templateName);
		await this.getTemplate(templateName);
	}

	/**
	 * 列出所有可用模板
	 */
	listTemplates(): string[] {
		const templatesFolder = this.app.vault.getAbstractFileByPath(this.settings.folderStructure.templatesPath);

		if (!templatesFolder) {
			return [];
		}

		const templates: string[] = [];
		const files = (templatesFolder as any).children || [];

		for (const file of files) {
			if (file instanceof TFile && file.extension === 'md') {
				templates.push(file.name);
			}
		}

		return templates;
	}
}
