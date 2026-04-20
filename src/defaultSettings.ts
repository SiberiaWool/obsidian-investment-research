import { InvestmentResearchSettings } from './types';

export type { InvestmentResearchSettings } from './types';

export const DEFAULT_SETTINGS: InvestmentResearchSettings = {
	folderStructure: {
		rootPath: '',
		dailyReviewPath: '0.周期复盘/0.日度复盘',
		weeklyReviewPath: '0.周期复盘/1.周度复盘',
		topicReviewPath: '0.周期复盘/2.专题复盘',
		sectorResearchPath: '1.研究/0.板块',
		stockRecentCorePath: '1.研究/1.个股/0.近期核心',
		stockLongTermPath: '1.研究/1.个股/1.长期跟踪',
		stockOtherPath: '1.研究/1.个股/2.其他覆盖',
		commodityResearchPath: '1.研究/2.商品',
		resourcesPath: '2.资源',
		archivePath: '3.存档',
		templatesPath: 'templates',
	},

	dataSources: {
		alphaPai: {
			enabled: false,
			apiKey: '',
			baseUrl: 'https://api.alphapai.com',
		},
		gangtise: {
			enabled: false,
			credentials: '',
		},
		wind: {
			enabled: false,
			pluginPath: '',
			manualTrigger: true,
		},
	},

	ai: {
		provider: 'custom',
		apiKey: '',
		model: 'gpt-3.5-turbo',
	},

	documents: {
		autoSummary: true,
		autoTagging: true,
		autoLinking: true,
		metadataTracking: true,
	},

	reminders: {
		enabled: true,
		earningsReport: true,
		events: true,
		dailyTasks: false,
	},

	userInfo: {
		name: '分析师',
		id: '',
	},
};
