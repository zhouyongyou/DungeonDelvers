// cache/nftMetadataCache.ts
// IndexedDB-based cache for NFT metadata

import { type CacheConfig, defaultCacheConfig } from './cacheStrategies';
import type { BaseNft } from '../types/nft';

// Type for cached metadata (without id, contractAddress, type)
type CachedMetadata = Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;

interface CacheEntry {
  tokenId: string;
  contractAddress: string;
  metadata: CachedMetadata;
  timestamp: number;
  expiresAt: number;
}

interface LocalCacheStats {
  totalItems: number;
  totalSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

class NFTMetadataCache {
  private dbName = 'nft-metadata-cache';
  private version = 1;
  private storeName = 'metadata';
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private memoryCache = new Map<string, CacheEntry>();

  constructor(config: CacheConfig = defaultCacheConfig) {
    this.config = config;
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('contractAddress', 'contractAddress', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private getCacheKey(tokenId: string, contractAddress: string): string {
    return `${contractAddress.toLowerCase()}-${tokenId}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private async ensureDBReady(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
  }

  async getMetadata(tokenId: string, contractAddress: string): Promise<CachedMetadata | null> {
    const key = this.getCacheKey(tokenId, contractAddress);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.metadata;
    }

    // Check IndexedDB
    try {
      await this.ensureDBReady();
      if (!this.db) return null;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result && !this.isExpired(result)) {
            // Add to memory cache
            this.memoryCache.set(key, result);
            resolve(result.metadata);
          } else {
            // Clean up expired entry
            if (result) {
              this.deleteFromIndexedDB(key);
            }
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Error reading from IndexedDB:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
      return null;
    }
  }

  async cacheMetadata(tokenId: string, contractAddress: string, metadata: CachedMetadata): Promise<void> {
    const key = this.getCacheKey(tokenId, contractAddress);
    const now = Date.now();
    const expiresAt = now + (this.config.ttl || 24 * 60 * 60 * 1000); // Default 24 hours

    const entry: CacheEntry = {
      tokenId,
      contractAddress: contractAddress.toLowerCase(),
      metadata,
      timestamp: now,
      expiresAt
    };

    // Add to memory cache
    this.memoryCache.set(key, entry);

    // Limit memory cache size
    if (this.memoryCache.size > (this.config.maxMemorySize || 100)) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Add to IndexedDB
    try {
      await this.ensureDBReady();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ key, ...entry });

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Error writing to IndexedDB:', request.error);
          resolve(); // Don't fail the whole operation
        };
      });
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
    }
  }

  async getCacheStats(): Promise<LocalCacheStats> {
    try {
      await this.ensureDBReady();
      if (!this.db) {
        return { totalItems: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
      }

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result as CacheEntry[];
          const validEntries = entries.filter(entry => !this.isExpired(entry));
          
          let oldestEntry: Date | null = null;
          let newestEntry: Date | null = null;
          
          if (validEntries.length > 0) {
            const timestamps = validEntries.map(entry => entry.timestamp);
            oldestEntry = new Date(Math.min(...timestamps));
            newestEntry = new Date(Math.max(...timestamps));
          }

          resolve({
            totalItems: validEntries.length,
            totalSize: JSON.stringify(validEntries).length,
            oldestEntry,
            newestEntry
          });
        };

        request.onerror = () => {
          console.error('Error reading cache stats:', request.error);
          resolve({ totalItems: 0, totalSize: 0, oldestEntry: null, newestEntry: null });
        };
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalItems: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
    }
  }

  async clearAllCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear IndexedDB
    try {
      await this.ensureDBReady();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Error clearing IndexedDB:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    try {
      await this.ensureDBReady();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Error deleting from IndexedDB:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error deleting from IndexedDB:', error);
    }
  }

  async cleanupExpiredEntries(): Promise<void> {
    try {
      await this.ensureDBReady();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result as CacheEntry[];
          const expiredKeys = entries
            .filter(entry => this.isExpired(entry))
            .map(entry => this.getCacheKey(entry.tokenId, entry.contractAddress));

          // Delete expired entries
          expiredKeys.forEach(key => {
            store.delete(key);
            this.memoryCache.delete(key);
          });

          resolve();
        };

        request.onerror = () => {
          console.error('Error cleaning up expired entries:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
    }
  }
}

// Export singleton instance
export const nftMetadataCache = new NFTMetadataCache();