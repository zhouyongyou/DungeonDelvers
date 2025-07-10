export interface TranslationResources {
  common: {
    buttons: {
      connect: string;
      disconnect: string;
      confirm: string;
      cancel: string;
      save: string;
      loading: string;
      retry: string;
      mint: string;
      stake: string;
      unstake: string;
      approve: string;
      claim: string;
      send: string;
      receive: string;
      explore: string;
      viewDetails: string;
      edit: string;
      delete: string;
      create: string;
      update: string;
      refresh: string;
      back: string;
      next: string;
      previous: string;
      submit: string;
      reset: string;
    };
    messages: {
      connectWallet: string;
      loadingResources: string;
      transactionPending: string;
      transactionSuccess: string;
      transactionFailed: string;
      noDataFound: string;
      errorOccurred: string;
      pleaseWait: string;
      confirmAction: string;
      actionCompleted: string;
      invalidInput: string;
      insufficientBalance: string;
      networkError: string;
      welcomeBack: string;
      goodLuck: string;
      congratulations: string;
    };
    theme: {
      light: string;
      dark: string;
      system: string;
    };
    status: {
      active: string;
      inactive: string;
      pending: string;
      completed: string;
      failed: string;
      expired: string;
      available: string;
      unavailable: string;
    };
    time: {
      seconds: string;
      minutes: string;
      hours: string;
      days: string;
      weeks: string;
      months: string;
      years: string;
      ago: string;
      remaining: string;
    };
  };
  navigation: {
    menu: {
      dashboard: string;
      profile: string;
      mint: string;
      party: string;
      dungeon: string;
      altar: string;
      codex: string;
      vip: string;
      referral: string;
      explorer: string;
      admin: string;
    };
    subtitle: string;
    recentTransactions: string;
    themeToggle: string;
    languageSelector: string;
  };
  game: {
    nft: {
      hero: string;
      artifact: string;
      party: string;
      rarity: {
        common: string;
        uncommon: string;
        rare: string;
        epic: string;
        legendary: string;
      };
      stats: {
        level: string;
        experience: string;
        health: string;
        attack: string;
        defense: string;
        speed: string;
        luck: string;
        power: string;
      };
    };
    dungeon: {
      expedition: string;
      explore: string;
      rewards: string;
      cooldown: string;
      fatigue: string;
      success: string;
      failure: string;
    };
    altar: {
      upgrade: string;
      starLevel: string;
      materials: string;
      probability: string;
      enhancement: string;
    };
    vip: {
      level: string;
      benefits: string;
      taxReduction: string;
      staking: string;
      rewards: string;
    };
  };
  errors: {
    walletNotConnected: string;
    transactionFailed: string;
    insufficientFunds: string;
    networkError: string;
    invalidAddress: string;
    contractError: string;
    userRejected: string;
    unknownError: string;
  };
}

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: TranslationResources;
  }
}