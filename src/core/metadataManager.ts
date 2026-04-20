import { App, TFile, MetadataCache } from 'obsidian';
import { DocumentMetadata } from '../types';

export class MetadataManager {
	constructor(private app: App) {}

	/**
	 * 从文件中提取元数据
	 */
	extractMetadata(file: TFile): DocumentMetadata | null {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache || !cache.frontmatter) {
			return null;
		}

		const frontmatter = cache.frontmatter;

		return {
			title: frontmatter.title || file.basename,
			date: frontmatter.date || new Date().toISOString().split('T')[0],
			type: frontmatter.type || '笔记',
			industry: frontmatter.industry,
			companies: frontmatter.companies || [],
			sectors: frontmatter.sectors || [],
			tags: frontmatter.tags || [],
			summary: frontmatter.summary,
			author: frontmatter.author || '',
			created: frontmatter.created || new Date().toISOString(),
			modified: frontmatter.modified || new Date().toISOString(),
			status: frontmatter.status || '进行中',
		};
	}

	/**
	 * 生成YAML frontmatter
	 */
	generateFrontmatter(metadata: DocumentMetadata): string {
		const lines: string[] = ['---'];

		// 基本信息
		if (metadata.title) lines.push(`title: "${metadata.title}"`);
		if (metadata.date) lines.push(`date: ${metadata.date}`);
		if (metadata.type) lines.push(`type: ${metadata.type}`);

		// 分类信息
		if (metadata.industry) lines.push(`industry: ${metadata.industry}`);
		if (metadata.companies && metadata.companies.length > 0) {
			lines.push(`companies: [${metadata.companies.map(c => `"${c}"`).join(', ')}]`);
		}
		if (metadata.sectors && metadata.sectors.length > 0) {
			lines.push(`sectors: [${metadata.sectors.map(s => `"${s}"`).join(', ')}]`);
		}

		// 标签
		if (metadata.tags && metadata.tags.length > 0) {
			lines.push(`tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]`);
		}

		// 摘要
		if (metadata.summary) {
			lines.push(`summary: "${metadata.summary.substring(0, 100)}${metadata.summary.length > 100 ? '...' : ''}"`);
		}

		// 作者和时间
		if (metadata.author) lines.push(`author: ${metadata.author}`);
		lines.push(`created: ${metadata.created}`);
		lines.push(`modified: ${metadata.modified}`);

		// 状态
		if (metadata.status) lines.push(`status: ${metadata.status}`);

		lines.push('---', '');

		return lines.join('\n');
	}

	/**
	 * 更新文件的元数据
	 */
	async updateFileMetadata(file: TFile, metadata: Partial<DocumentMetadata>): Promise<void> {
		const existingMetadata = this.extractMetadata(file);
		const updatedMetadata = { ...existingMetadata, ...metadata } as DocumentMetadata;

		// 更新modified时间
		updatedMetadata.modified = new Date().toISOString();

		// 读取文件内容
		let content = await this.app.vault.read(file);

		// 移除现有的frontmatter
		content = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');

		// 添加新的frontmatter
		const newFrontmatter = this.generateFrontmatter(updatedMetadata);
		content = newFrontmatter + content;

		// 写入文件
		await this.app.vault.modify(file, content);
	}

	/**
	 * 在文件创建时自动添加元数据
	 */
	async addInitialMetadata(
		file: TFile,
		initialData: {
			title?: string;
			type?: DocumentMetadata['type'];
			industry?: string;
			companies?: string[];
			sectors?: string[];
			tags?: string[];
			date?: string;
		}
	): Promise<void> {
		const now = new Date().toISOString();
		const today = now.split('T')[0];

		const metadata: DocumentMetadata = {
			title: initialData.title || file.basename,
			date: initialData.date || today,
			type: initialData.type || '笔记',
			industry: initialData.industry,
			companies: initialData.companies || [],
			sectors: initialData.sectors || [],
			tags: initialData.tags || [],
			author: '分析师',
			created: now,
			modified: now,
			status: '进行中',
		};

		await this.updateFileMetadata(file, metadata);
	}

	/**
	 * 从文件内容中提取公司名称（简单的关键词匹配）
	 */
	extractCompanyNames(content: string): string[] {
		const companyKeywords = [
			'贵州茅台', '五粮液', '泸州老窖', '剑南春',
			'腾讯', '阿里巴巴', '字节跳动', '美团',
			'比亚迪', '宁德时代', '理想汽车', '蔚来', '小鹏汽车',
			'招商银行', '平安银行', '工商银行', '建设银行',
			'中国平安', '中国人寿', '东方财富',
			'中芯国际', '韦尔股份', '兆易创新',
			'隆基绿能', '通威股份', '阳光电源',
			'金山办公', '恒生电子', '同花顺',
			// 可扩展更多公司名称
		];

		const found: string[] = [];
		for (const company of companyKeywords) {
			if (content.includes(company)) {
				found.push(company);
			}
		}

		return [...new Set(found)];
	}

	/**
	 * 从文件内容中提取板块标签（基于同花顺概念板块）
	 */
	extractSectors(content: string): string[] {
		const sectors: string[] = [];

		// 同花顺主要概念板块分类
		const sectorConcepts: { [key: string]: string[] } = {
			'AI产业链': ['AI', '人工智能', '算力', '大模型', 'ChatGPT', 'AIGC'],
			'白酒': ['白酒', '茅台', '五粮液', '剑南春', '泸州老窖'],
			'新能源汽车': ['新能源车', '电动车', '混动', '电池'],
			'半导体': ['芯片', '半导体', '集成电路', '存储'],
			'锂电池': ['锂电', '锂电池', '动力电池', '电解液', '隔膜'],
			'光伏': ['光伏', '太阳能', '硅片', '组件', '逆变器'],
			'风电': ['风电', '风力发电', '风机', '叶片'],
			'医药生物': ['医药', '生物', '疫苗', '创新药', 'CRO'],
			'国防军工': ['军工', '国防', '航空', '航天', '雷达'],
			'金融': ['银行', '保险', '券商', '信托', '金融'],
			'房地产': ['房地产', '地产', '物业'],
			'电子': ['消费电子', '面板', 'LED', '光学'],
			'计算机': ['软件', '云计算', '网络安全', '数字化'],
			'通信': ['5G', '通信', '基站', '光纤'],
			'化工': ['化工', '化纤', '塑料', '橡胶'],
			'机械': ['机械', '设备', '机床', '工程机械'],
			'汽车': ['整车', '零部件', '新能源车'],
			'电力': ['电力', '电网', '发电', '新能源发电'],
			'煤炭': ['煤炭', '煤化工', '焦煤'],
			'石油石化': ['石油', '石化', '炼化', '油气'],
			'钢铁': ['钢铁', '特钢', '铁矿石'],
			'有色金属': ['铜', '铝', '锂', '钴', '镍'],
		};

		// 匹配概念板块
		for (const [sector, keywords] of Object.entries(sectorConcepts)) {
			for (const keyword of keywords) {
				if (content.includes(keyword)) {
					sectors.push(sector);
					break;
				}
			}
		}

		return [...new Set(sectors)]; // 去重
	}

	/**
	 * 从文件内容中提取行业标签
	 */
	extractIndustry(content: string): string | null {
		const industryMap: { [key: string]: string } = {
			'白酒': '白酒',
			'半导体': '半导体',
			'新能源': '新能源',
			'汽车': '汽车',
			'银行': '金融',
			'保险': '金融',
			'医药': '医药',
			'房地产': '房地产',
			'电子': '电子',
			'计算机': '计算机',
			'通信': '通信',
		};

		for (const [keyword, industry] of Object.entries(industryMap)) {
			if (content.includes(keyword)) {
				return industry;
			}
		}

		return null;
	}

	/**
	 * 从文件内容中提取标签
	 */
	extractTags(content: string): string[] {
		const tags: string[] = [];

		// 提取行业标签
		const industry = this.extractIndustry(content);
		if (industry) {
			tags.push(`行业/${industry}`);
		}

		// 提取板块标签
		const sectors = this.extractSectors(content);
		for (const sector of sectors) {
			tags.push(`板块/${sector}`);
		}

		// 提取公司标签
		const companies = this.extractCompanyNames(content);
		for (const company of companies) {
			tags.push(`公司/${company}`);
		}

		// 提取主题标签
		const topicKeywords = {
			'提价': '主题/提价',
			'扩产': '主题/扩产',
			'并购': '主题/并购',
			'重组': '主题/重组',
			'业绩': '主题/业绩',
			'政策': '主题/政策',
			'渠道': '主题/渠道',
			'新品': '主题/新品',
			'回购': '主题/回购',
			'分红': '主题/分红',
			'解禁': '主题/解禁',
		};

		for (const [keyword, tag] of Object.entries(topicKeywords)) {
			if (content.includes(keyword)) {
				tags.push(tag);
			}
		}

		return [...new Set(tags)]; // 去重
	}
}
