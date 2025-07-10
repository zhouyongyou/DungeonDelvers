// cache/nftMetadataCache.ts
import type { BaseNft } from '../types/nft';

interface CachedMetadata {
    tokenId: string;
    contractAddress: string;
    metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;
    timestamp: number;
}

class NFTMetadataCache {
    private dbName = 'nft-metadata-cache';
    private storeName = 'metadata';
    private version = 1;
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'cacheKey' });
                    store.createIndex('tokenId', 'tokenId', { unique: false });
                    store.createIndex('contractAddress', 'contractAddress', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    private getCacheKey(tokenId: string, contractAddress: string): string {
        return `${contractAddress.toLowerCase()}_${tokenId}`;
    }

    async getMetadata(
        tokenId: string, 
        contractAddress: string
    ): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'> | null> {
        try {
            await this.init();
            if (!this.db) return null;

            const cacheKey = this.getCacheKey(tokenId, contractAddress);
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve) => {
                const request = store.get(cacheKey);
                
                request.onsuccess = () => {
                    const result = request.result as CachedMetadata;
                    if (result) {
                        resolve(result.metadata);
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.warn('Error reading from cache:', request.error);
                    resolve(null);
                };
            });
        } catch (error) {
            console.warn('Error accessing cache:', error);
            return null;
        }
    }

    async cacheMetadata(
        tokenId: string, 
        contractAddress: string, 
        metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>
    ): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const cacheKey = this.getCacheKey(tokenId, contractAddress);
            const cachedData: CachedMetadata = {
                tokenId,
                contractAddress: contractAddress.toLowerCase(),
                metadata,
                timestamp: Date.now()
            };

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.put({ ...cachedData, cacheKey });
                
                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.warn('Error writing to cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.warn('Error caching metadata:', error);
        }
    }

    async clearCache(): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Error clearing cache:', error);
        }
    }

    async getCacheSize(): Promise<number> {
        try {
            await this.init();
            if (!this.db) return 0;

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve) => {
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(0);
            });
        } catch (error) {
            console.warn('Error getting cache size:', error);
            return 0;
        }
    }
}

export const nftMetadataCache = new NFTMetadataCache();