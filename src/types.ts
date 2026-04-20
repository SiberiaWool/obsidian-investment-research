export interface CompanyInfo {
	code: string;
	name: string;
	industry?: string;
	sector?: string;
	marketCap?: number;
	category?: '近期核心' | '长期跟踪' | '其他覆盖';
}

export interface DocumentMetadata {
	title?: string;
	date: string;
	type: '日度复盘' | '周度复盘' | '专题复盘' | '个股研究' | '板块研究' | '商品研究' | '纪要' | '公告' | '笔记' | '其他';
	industry?: string;
	companies?: string[];
	sectors?: string[];
	tags?: string[];
	summary?: string;
	author: string;
	created: string;
	modified: string;
	status?: '进行中' | '已完成' | '待验证';
	relatedDocs?: string[];
}

export interface KeyDriver {
	name: string;
	currentStatus: string;
	historicalChange: string;
	impact: number; // 1-5
	lastUpdated: string;
}

export interface DisagreementPoint {
	title: string;
	bullishView: {
		points: string[];
		sources: string[];
	};
	bearishView: {
		points: string[];
		sources: string[];
	};
	ourView: {
		confidence: number;
		logic: string;
		needToVerify: string[];
	};
}

export interface TodoItem {
	task: string;
	priority: 'high' | 'medium' | 'low';
	deadline?: string;
	completed: boolean;
}

export interface InvestmentResearchSettings {
	folderStructure: {
		rootPath: string;
		dailyReviewPath: string;
		weeklyReviewPath: string;
		topicReviewPath: string;
		sectorResearchPath: string;
		stockRecentCorePath: string;
		stockLongTermPath: string;
		stockOtherPath: string;
		commodityResearchPath: string;
		resourcesPath: string;
		archivePath: string;
		templatesPath: string;
	};

	dataSources: {
		alphaPai: {
			enabled: boolean;
			apiKey: string;
			baseUrl: string;
		};
		gangtise: {
			enabled: boolean;
			credentials: string;
		};
		wind: {
			enabled: boolean;
			pluginPath: string;
			manualTrigger: boolean;
		};
	};

	ai: {
		provider: 'alphaPai' | 'gangtise' | 'openai' | 'custom';
		apiKey: string;
		model: string;
	};

	documents: {
		autoSummary: boolean;
		autoTagging: boolean;
		autoLinking: boolean;
		metadataTracking: boolean;
	};

	reminders: {
		enabled: boolean;
		earningsReport: boolean;
		events: boolean;
		dailyTasks: boolean;
	};

	userInfo: {
		name: string;
		id: string;
	};
}
