/**
 * Storage Adapter - Handles data persistence for TAX4US
 * Provides production-ready storage with fallback to local files in development
 */

import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { logger } from '../utils/logger'

export interface StorageAdapter {
  read<T>(key: string): Promise<T[]>
  write<T>(key: string, data: T[]): Promise<void>
  append<T>(key: string, item: T): Promise<void>
  update<T>(key: string, id: string, updater: (item: T) => T): Promise<void>
  delete(key: string, id: string): Promise<void>
}

/**
 * File System Storage Adapter (Development)
 * Falls back to local JSON files for development/testing
 */
class FileSystemAdapter implements StorageAdapter {
  private dataDir: string

  constructor(dataDir = './data') {
    this.dataDir = dataDir
  }

  async read<T>(key: string): Promise<T[]> {
    try {
      const filePath = path.join(this.dataDir, `${key}.json`)
      if (!existsSync(filePath)) {
        return []
      }
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      logger.error('FileStorage', `Read error for ${key}`, error)
      return []
    }
  }

  async write<T>(key: string, data: T[]): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, `${key}.json`)
      
      // Ensure directory exists
      if (!existsSync(this.dataDir)) {
        await mkdir(this.dataDir, { recursive: true })
      }
      
      await writeFile(filePath, JSON.stringify(data, null, 2))
      logger.info('FileStorage', `Successfully wrote ${data.length} items to ${key}`)
    } catch (error) {
      logger.error('FileStorage', `Write error for ${key}`, error)
      throw new Error(`Failed to write to ${key}: ${error}`)
    }
  }

  async append<T>(key: string, item: T): Promise<void> {
    const data = await this.read<T>(key)
    data.push(item)
    await this.write(key, data)
  }

  async update<T>(key: string, id: string, updater: (item: T) => T): Promise<void> {
    const data = await this.read<T>(key)
    const index = data.findIndex((item: any) => item.id === id)
    if (index !== -1) {
      data[index] = updater(data[index])
      await this.write(key, data)
    }
  }

  async delete(key: string, id: string): Promise<void> {
    const data = await this.read<any>(key)
    const filtered = data.filter((item: any) => item.id !== id)
    await this.write(key, filtered)
  }
}

/**
 * External Storage Adapter (Production)
 * Uses external storage service for production deployment
 */
class ExternalStorageAdapter implements StorageAdapter {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.EXTERNAL_STORAGE_URL || 'https://api.jsonbin.io/v3'
    this.apiKey = process.env.EXTERNAL_STORAGE_KEY || ''
  }

  private async fetchData<T>(key: string): Promise<T[]> {
    try {
      if (!this.apiKey) {
        logger.warn('ExternalStorage', 'No API key configured, using in-memory fallback')
        return []
      }

      const response = await fetch(`${this.baseUrl}/b/${key}`, {
        headers: {
          'X-Master-Key': this.apiKey,
          'X-Bin-Meta': 'false'
        }
      })

      if (response.status === 404) {
        return [] // Bin doesn't exist yet
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      logger.warn('ExternalStorage', `Failed to read ${key}, using fallback`, error)
      return []
    }
  }

  private async storeData<T>(key: string, data: T[]): Promise<void> {
    try {
      if (!this.apiKey) {
        logger.warn('ExternalStorage', 'No API key configured, operation skipped')
        return
      }

      const response = await fetch(`${this.baseUrl}/b/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.apiKey
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      logger.info('ExternalStorage', `Successfully stored ${data.length} items to ${key}`)
    } catch (error) {
      logger.error('ExternalStorage', `Failed to store ${key}`, error)
      // Don't throw in production - log and continue
      logger.warn('ExternalStorage', `Continuing without persistence for ${key}`)
    }
  }

  async read<T>(key: string): Promise<T[]> {
    return this.fetchData<T>(key)
  }

  async write<T>(key: string, data: T[]): Promise<void> {
    await this.storeData(key, data)
  }

  async append<T>(key: string, item: T): Promise<void> {
    const data = await this.read<T>(key)
    data.push(item)
    await this.write(key, data)
  }

  async update<T>(key: string, id: string, updater: (item: T) => T): Promise<void> {
    const data = await this.read<T>(key)
    const index = data.findIndex((item: any) => item.id === id)
    if (index !== -1) {
      data[index] = updater(data[index])
      await this.write(key, data)
    }
  }

  async delete(key: string, id: string): Promise<void> {
    const data = await this.read<any>(key)
    const filtered = data.filter((item: any) => item.id !== id)
    await this.write(key, filtered)
  }
}

/**
 * Get appropriate storage adapter based on environment
 */
export function createStorageAdapter(): StorageAdapter {
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    logger.info('Storage', 'Using external storage adapter for production')
    return new ExternalStorageAdapter()
  } else {
    logger.info('Storage', 'Using file system adapter for development')
    return new FileSystemAdapter()
  }
}

// Global storage instance
export const storage = createStorageAdapter()