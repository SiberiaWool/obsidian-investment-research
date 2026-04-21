import { Plugin, TFile, Notice, Modal, Setting, PluginSettingTab, App } from 'obsidian';
import { InvestmentResearchSettings, DEFAULT_SETTINGS } from './defaultSettings';
import { FileManager } from './core/fileManager';
import { MetadataManager } from './core/metadataManager';
import { TemplateEngine } from './core/templateEngine';
import { TemplateManager } from './core/templateManager';
import { LinkManager } from './core/linkManager';
import { CompanyResearchGenerator } from './automation/companyResearchGenerator';
import { CompanyInfo } from './types';

export default class InvestmentResearchPlugin extends Plugin {
	settings!: InvestmentResearchSettings;
	fileManager!: FileManager;
	metadataManager!: MetadataManager;
	templateEngine!: TemplateEngine;
	templateManager!: TemplateManager;
	linkManager!: LinkManager;
	companyGenerator!: CompanyResearchGenerator;

	async onload() {
		console.log('Loading Investment Research Plugin');

		// 加载设置
		await this.loadSettings();

		// 初始化核心管理器
		this.fileManager = new FileManager(this.app, this.settings);
		this.metadataManager = new MetadataManager(this.app);
		this.templateEngine = new TemplateEngine(this.settings.userInfo.name);
		this.templateManager = new TemplateManager(this.app, this.settings);
		this.linkManager = new LinkManager(this.app, this.settings, this.app.metadataCache);
		this.companyGenerator = new CompanyResearchGenerator(this.app, this.settings, this.templateEngine);

		// 注册命令
		this.registerCommands();

		// 注册事件
		this.registerEvents();

		// 添加设置标签页
		this.addSettingsTab();
	}

	onunload() {
		console.log('Unloading Investment Research Plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 注册命令
	 */
	private registerCommands() {
		// ========== 初始化命令 ==========

		// 初始化投研知识库
		this.addCommand({
			id: 'init-knowledge-base',
			name: '初始化投研知识库',
			callback: async () => {
				try {
					await this.fileManager.initializeFolderStructure();
					new Notice('投研知识库初始化成功');
				} catch (error) {
					new Notice(`初始化失败: ${(error as Error).message}`);
				}
			},
		});

		// ========== 复盘相关命令 ==========

		// 创建日度复盘
		this.addCommand({
			id: 'create-daily-review',
			name: '创建日度复盘',
			callback: () => {
				new DateReviewModal(this.app, this.templateManager, this.metadataManager).open();
			},
		});

		// 创建周度复盘
		this.addCommand({
			id: 'create-weekly-review',
			name: '创建周度复盘',
			callback: () => {
				new WeeklyReviewModal(this.app, this.templateManager, this.metadataManager).open();
			},
		});

		// ========== 个股研究相关命令 ==========

		// 创建个股研究（近期核心）
		this.addCommand({
			id: 'create-stock-recent-core',
			name: '创建个股研究（近期核心）',
			callback: () => {
				new StockResearchModal(this.app, this.companyGenerator, '近期核心').open();
			},
		});

		// 创建个股研究（长期跟踪）
		this.addCommand({
			id: 'create-stock-long-term',
			name: '创建个股研究（长期跟踪）',
			callback: () => {
				new StockResearchModal(this.app, this.companyGenerator, '长期跟踪').open();
			},
		});

		// 创建个股研究（其他覆盖）
		this.addCommand({
			id: 'create-stock-other',
			name: '创建个股研究（其他覆盖）',
			callback: () => {
				new StockResearchModal(this.app, this.companyGenerator, '其他覆盖').open();
			},
		});

		// ========== 板块研究相关命令 ==========

		// 创建板块研究
		this.addCommand({
			id: 'create-sector-research',
			name: '创建板块研究',
			callback: () => {
				new SectorResearchModal(this.app, this.settings).open();
			},
		});

		// ========== 通用功能命令 ==========

		// 更新当前文件标签
		this.addCommand({
			id: 'update-file-tags',
			name: '更新当前文件标签',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return false;

				if (!checking) {
					this.updateFileTags(activeFile);
				}
				return true;
			},
		});

		// 查找相关文档
		this.addCommand({
			id: 'find-related-docs',
			name: '查找相关文档',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return false;

				if (!checking) {
					this.findRelatedDocuments(activeFile);
				}
				return true;
			},
		});

		// 创建关联链接
		this.addCommand({
			id: 'create-related-links',
			name: '创建关联链接',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return false;

				if (!checking) {
					this.linkManager.createRelatedLinks(activeFile);
					new Notice('关联链接创建成功');
				}
				return true;
			},
		});

		// 重新加载模板
		this.addCommand({
			id: 'reload-templates',
			name: '重新加载模板',
			callback: () => {
				this.templateManager.clearCache();
				new Notice('模板缓存已清除');
			},
		});
	}

	/**
	 * 注册事件
	 */
	private registerEvents() {
		// 使用metadataCache监听文件解析事件
		const resolveHandler = (data: any) => {
			const file = data.file as TFile;
			if (file && file.extension === 'md' && this.settings.documents.metadataTracking) {
				// 延迟执行，确保文件完全创建
				setTimeout(async () => {
					try {
						const content = await this.app.vault.read(file);

						// 检查是否已有frontmatter
						if (!content.startsWith('---')) {
							const tags = this.metadataManager.extractTags(content);
							const companies = this.metadataManager.extractCompanyNames(content);
							const sectors = this.metadataManager.extractSectors(content);
							const industry = this.metadataManager.extractIndustry(content);

							await this.metadataManager.addInitialMetadata(file, {
								type: '笔记',
								tags: tags,
								companies: companies.length > 0 ? companies : undefined,
								sectors: sectors.length > 0 ? sectors : undefined,
								industry: industry || undefined,
							});

							new Notice(`已自动为 ${file.basename} 添加元数据`);
						}
					} catch (error) {
						console.error('自动添加元数据失败:', error);
					}
				}, 1000);
			}
		};

		// 注册事件处理器
		this.app.metadataCache.on('resolve', resolveHandler);

		// 注册清理函数
		this.registerEvent(() => {
			this.app.metadataCache.off('resolve', resolveHandler);
		});
	}

	/**
	 * 更新文件标签
	 */
	private async updateFileTags(file: TFile) {
		try {
			const content = await this.fileManager.readFile(file);
			const tags = this.metadataManager.extractTags(content);
			const companies = this.metadataManager.extractCompanyNames(content);
			const sectors = this.metadataManager.extractSectors(content);
			const industry = this.metadataManager.extractIndustry(content);

			await this.metadataManager.updateFileMetadata(file, {
				tags: tags,
				companies: companies,
				sectors: sectors,
				industry: industry || undefined,
			});

			new Notice(`已更新 ${file.basename} 的标签`);
		} catch (error) {
			new Notice(`标签更新失败: ${(error as Error).message}`);
		}
	}

	/**
	 * 查找相关文档
	 */
	private async findRelatedDocuments(file: TFile) {
		try {
			await this.linkManager.createRelatedLinks(file);
			new Notice('相关文档链接已添加');
		} catch (error) {
			new Notice(`查找相关文档失败: ${(error as Error).message}`);
		}
	}

	/**
	 * 添加设置标签页
	 */
	private addSettingsTab() {
		this.addSettingTab(new InvestmentResearchSettingTab(this.app, this));
	}
}

// ========== 模态框类 ==========

/**
 * 日度复盘创建模态框
 */
class DateReviewModal extends Modal {
	constructor(
		app: App,
		private templateManager: TemplateManager,
		private metadataManager: MetadataManager
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '创建日度复盘' });

		const date = new Date().toISOString().split('T')[0];
		const dateInput = contentEl.createEl('input', {
			type: 'date',
			value: date,
		});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('创建')
					.setCta()
					.onClick(async () => {
						const selectedDate = dateInput.value;

						try {
							// 使用模板创建文档
							const content = await this.templateManager.renderTemplate('日复盘.md', {
								date: selectedDate,
							});

							const filename = `日度复盘_${selectedDate}.md`;
							const folder = this.app.vault.getAbstractFileByPath(
								this.templateManager['settings'].folderStructure.dailyReviewPath
							);

							if (!folder) {
								new Notice('日度复盘文件夹不存在');
								return;
							}

							const file = await this.app.vault.create(`${folder.path}/${filename}`, content);

							// 添加元数据
							await this.metadataManager.addInitialMetadata(file, {
								title: `日度复盘_${selectedDate}`,
								type: '日度复盘',
								date: selectedDate,
								tags: ['复盘', '日度'],
							});

							new Notice('日度复盘创建成功');
							this.close();

							// 打开文件
							this.app.workspace.openLinkText(file.path, '');
						} catch (error) {
							new Notice(`创建失败: ${(error as Error).message}`);
						}
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}

/**
 * 周度复盘创建模态框
 */
class WeeklyReviewModal extends Modal {
	constructor(
		app: App,
		private templateManager: TemplateManager,
		private metadataManager: MetadataManager
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '创建周度复盘' });

		const dateInput = contentEl.createEl('input', {
			type: 'week',
		});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('创建')
					.setCta()
					.onClick(async () => {
						const selectedWeek = dateInput.value || this.getCurrentWeek();

						try {
							// 使用模板创建文档
							const content = await this.templateManager.renderTemplate('周复盘.md', {
								week: selectedWeek,
							});

							const filename = `周度复盘_${selectedWeek}.md`;
							const folder = this.app.vault.getAbstractFileByPath(
								this.templateManager['settings'].folderStructure.weeklyReviewPath
							);

							if (!folder) {
								new Notice('周度复盘文件夹不存在');
								return;
							}

							const file = await this.app.vault.create(`${folder.path}/${filename}`, content);

							// 添加元数据
							await this.metadataManager.addInitialMetadata(file, {
								title: `周度复盘_${selectedWeek}`,
								type: '周度复盘',
								date: selectedWeek,
								tags: ['复盘', '周度'],
							});

							new Notice('周度复盘创建成功');
							this.close();

							// 打开文件
							this.app.workspace.openLinkText(file.path, '');
						} catch (error) {
							new Notice(`创建失败: ${(error as Error).message}`);
						}
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}

	private getCurrentWeek(): string {
		const now = new Date();
		const year = now.getFullYear();
		const week = this.getWeekNumber(now);
		return `${year}-W${(week < 10 ? '0' + week : week)}`;
	}

	private getWeekNumber(date: Date): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	}
}

/**
 * 个股研究创建模态框
 */
class StockResearchModal extends Modal {
	codeInput!: HTMLInputElement;
	nameInput!: HTMLInputElement;
	sectorInput!: HTMLInputElement;

	constructor(
		app: App,
		private companyGenerator: CompanyResearchGenerator,
		private category: '近期核心' | '长期跟踪' | '其他覆盖'
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `创建个股研究（${this.category}）` });

		new Setting(contentEl)
			.setName('股票代码')
			.setDesc('例如：600519')
			.addText((text) => {
				this.codeInput = text.inputEl;
				text.setPlaceholder('600519');
			});

		new Setting(contentEl)
			.setName('公司名称')
			.setDesc('例如：贵州茅台')
			.addText((text) => {
				this.nameInput = text.inputEl;
				text.setPlaceholder('贵州茅台');
			});

		new Setting(contentEl)
			.setName('所属板块')
			.setDesc('例如：白酒、半导体')
			.addText((text) => {
				this.sectorInput = text.inputEl;
				text.setPlaceholder('白酒');
			});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('创建')
					.setCta()
					.onClick(async () => {
						const code = this.codeInput.value.trim();
						const name = this.nameInput.value.trim();
						const sector = this.sectorInput.value.trim();

						if (!code || !name || !sector) {
							new Notice('请填写完整信息');
							return;
						}

						if (this.companyGenerator.exists(code)) {
							new Notice('该公司研究文件夹已存在');
							return;
						}

						const companyInfo: CompanyInfo = {
							code,
							name,
							industry: sector,
							category: this.category,
						};

						try {
							await this.companyGenerator.createCompanyResearch(companyInfo);
							this.close();
						} catch (error) {
							new Notice(`创建失败: ${(error as Error).message}`);
						}
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}

/**
 * 板块研究创建模态框
 */
class SectorResearchModal extends Modal {
	nameInput!: HTMLInputElement;

	constructor(
		app: App,
		private settings: InvestmentResearchSettings
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '创建板块研究' });

		new Setting(contentEl)
			.setName('板块名称')
			.setDesc('例如：白酒、半导体、新能源')
			.addText((text) => {
				this.nameInput = text.inputEl;
				text.setPlaceholder('白酒');
			});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('创建')
					.setCta()
					.onClick(async () => {
						const sectorName = this.nameInput.value.trim();

						if (!sectorName) {
							new Notice('请填写板块名称');
							return;
						}

						try {
							// 创建板块研究文件夹
							const rootPath = this.settings.folderStructure.rootPath;
							const sectorPath = this.settings.folderStructure.sectorResearchPath;
							const fullPath = rootPath ? `${rootPath}/${sectorPath}/${sectorName}` : `${sectorPath}/${sectorName}`;
							await this.app.vault.createFolder(fullPath);

							// 创建关键文档
							const files = [
								{ name: '板块概览.md', title: `${sectorName}板块概览` },
								{ name: '核心个股.md', title: `${sectorName}核心个股` },
								{ name: '市场观点.md', title: `${sectorName}市场观点` },
								{ name: '跟踪指标.md', title: `${sectorName}跟踪指标` },
							];

							for (const file of files) {
								const content = `# ${file.title}\n\n> 创建时间：${new Date().toISOString()}\n\n`;
								await this.app.vault.create(`${fullPath}/${file.name}`, content);
							}

							new Notice(`${sectorName}板块研究创建成功`);
							this.close();
						} catch (error) {
							new Notice(`创建失败: ${(error as Error).message}`);
						}
					});
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}

/**
 * 设置标签页
 */
class InvestmentResearchSettingTab extends PluginSettingTab {
	plugin: InvestmentResearchPlugin;

	constructor(app: App, plugin: InvestmentResearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '投研IDE插件设置' });

		// 文件夹结构配置
		containerEl.createEl('h3', { text: '文件夹结构' });

		new Setting(containerEl)
			.setName('根路径')
			.setDesc('投研知识库的根文件夹路径')
			.addText((text) =>
				text
					.setPlaceholder('投研知识库')
					.setValue(this.plugin.settings.folderStructure.rootPath)
					.onChange(async (value) => {
						this.plugin.settings.folderStructure.rootPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('模板文件夹路径')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.folderStructure.templatesPath)
					.onChange(async (value) => {
						this.plugin.settings.folderStructure.templatesPath = value;
						await this.plugin.saveSettings();
					})
			);

		// 文档配置
		containerEl.createEl('h3', { text: '文档设置' });

		new Setting(containerEl)
			.setName('自动添加元数据')
			.setDesc('新建文档时自动添加元数据')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.documents.metadataTracking)
					.onChange(async (value) => {
						this.plugin.settings.documents.metadataTracking = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('自动提取标签')
			.setDesc('自动从文档内容中提取标签')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.documents.autoTagging)
					.onChange(async (value) => {
						this.plugin.settings.documents.autoTagging = value;
						await this.plugin.saveSettings();
					})
			);

		// 用户信息
		containerEl.createEl('h3', { text: '用户信息' });

		new Setting(containerEl)
			.setName('分析师姓名')
			.setDesc('用于记录文档作者')
			.addText((text) =>
				text
					.setPlaceholder('分析师')
					.setValue(this.plugin.settings.userInfo.name)
					.onChange(async (value) => {
						this.plugin.settings.userInfo.name = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
