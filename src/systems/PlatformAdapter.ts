export interface PlatformAdapter {
    gameplayStart(): void;
    gameplayStop(): void;
    commercialBreak(): Promise<boolean>;
    rewardedAd(): Promise<boolean>;
}
export class LocalPlatform implements PlatformAdapter {
    gameplayStart() { }
    gameplayStop() { }
    async commercialBreak() { return false; }
    async rewardedAd() { return false; }
}
