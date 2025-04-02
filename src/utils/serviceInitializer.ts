/**
 * Service Initializer Utility
 * 
 * This utility provides a centralized method for initializing AI services
 * to reduce redundant initializations and improve performance.
 */

import { ConsolidatedAIService } from '@/services/consolidatedAIService';
import { UnifiedAIService } from '@/services/aiServicesAdapter';
import { logger } from '@/utils/logger';

// Cache of initialized services to avoid duplicate instances
const serviceCache: Record<string, any> = {};

// Stats for monitoring service creation
const serviceStats = {
  created: 0,
  reused: 0,
  cacheHits: {} as Record<string, number>,
  lastCreated: {} as Record<string, Date>
};

interface ServiceOptions {
  forceNew?: boolean;
  useAdapter?: boolean;
  debug?: boolean;
}

/**
 * Get or create a ConsolidatedAIService instance
 * @param clientId The client ID to use for service initialization
 * @param options Additional options for service initialization
 * @returns An initialized ConsolidatedAIService instance
 */
export function getAIService(clientId: string, options: ServiceOptions = {}): ConsolidatedAIService {
  const cacheKey = `consolidated:${clientId}`;
  
  // Check if we have a cached instance unless forceNew is true
  if (!options.forceNew && serviceCache[cacheKey]) {
    // Track cache hits
    serviceStats.reused++;
    serviceStats.cacheHits[cacheKey] = (serviceStats.cacheHits[cacheKey] || 0) + 1;
    
    logger.info(`Using cached ConsolidatedAIService for client ${clientId}`, {
      service: 'serviceInitializer',
      action: 'getAIService',
      sendToServer: false,
      cacheStats: {
        hits: serviceStats.cacheHits[cacheKey],
        totalReused: serviceStats.reused,
        created: serviceStats.created
      }
    });
    return serviceCache[cacheKey];
  }
  
  // Create a new instance
  serviceStats.created++;
  serviceStats.lastCreated[cacheKey] = new Date();
  
  logger.info(`Creating new ConsolidatedAIService for client ${clientId}`, {
    service: 'serviceInitializer',
    action: 'getAIService',
    sendToServer: false,
    cacheStats: {
      totalCreated: serviceStats.created,
      totalReused: serviceStats.reused
    }
  });
  const service = new ConsolidatedAIService(clientId);
  
  // Cache the instance
  serviceCache[cacheKey] = service;
  
  return service;
}

/**
 * Get or create a UnifiedAIService instance (adapter)
 * @param clientId The client ID to use for service initialization
 * @param options Additional options for service initialization
 * @returns An initialized UnifiedAIService instance
 */
export function getAdaptedAIService(clientId: string, options: ServiceOptions = {}): UnifiedAIService {
  const cacheKey = `unified:${clientId}`;
  
  // Check if we have a cached instance unless forceNew is true
  if (!options.forceNew && serviceCache[cacheKey]) {
    // Track cache hits
    serviceStats.reused++;
    serviceStats.cacheHits[cacheKey] = (serviceStats.cacheHits[cacheKey] || 0) + 1;
    
    logger.info(`Using cached UnifiedAIService adapter for client ${clientId}`, {
      service: 'serviceInitializer',
      action: 'getAdaptedAIService',
      sendToServer: false,
      cacheStats: {
        hits: serviceStats.cacheHits[cacheKey],
        totalReused: serviceStats.reused,
        created: serviceStats.created
      }
    });
    return serviceCache[cacheKey];
  }
  
  // Create a new instance
  serviceStats.created++;
  serviceStats.lastCreated[cacheKey] = new Date();
  
  logger.info(`Creating new UnifiedAIService adapter for client ${clientId}`, {
    service: 'serviceInitializer',
    action: 'getAdaptedAIService',
    sendToServer: false,
    cacheStats: {
      totalCreated: serviceStats.created,
      totalReused: serviceStats.reused
    }
  });
  const service = new UnifiedAIService(clientId);
  
  // Cache the instance
  serviceCache[cacheKey] = service;
  
  return service;
}

/**
 * Get the appropriate AI service based on options
 * @param clientId The client ID to use for service initialization
 * @param options Additional options for service initialization
 * @returns Either a ConsolidatedAIService or UnifiedAIService instance
 */
export function getAppropriateAIService(clientId: string, options: ServiceOptions = {}) {
  if (options.useAdapter) {
    return getAdaptedAIService(clientId, options);
  }
  return getAIService(clientId, options);
}

/**
 * Clear the service cache
 * @param clientId Optional client ID to clear only services for that client
 */
export function clearServiceCache(clientId?: string) {
  if (clientId) {
    // Clear only services for this client
    const keysToDelete = Object.keys(serviceCache).filter(key => key.endsWith(`:${clientId}`));
    keysToDelete.forEach(key => {
      delete serviceCache[key];
    });
    logger.info(`Cleared service cache for client ${clientId}`, {
      service: 'serviceInitializer',
      action: 'clearServiceCache',
      sendToServer: false,
      keysCleared: keysToDelete
    });
  } else {
    // Clear all services
    const keyCount = Object.keys(serviceCache).length;
    Object.keys(serviceCache).forEach(key => {
      delete serviceCache[key];
    });
    logger.info('Cleared all service caches', {
      service: 'serviceInitializer',
      action: 'clearServiceCache',
      sendToServer: false,
      keysCleared: keyCount
    });
  }
}

/**
 * Get statistics about service usage
 * Useful for debugging duplication issues
 */
export function getServiceStats() {
  return {
    ...serviceStats,
    cacheSize: Object.keys(serviceCache).length,
    cachedServices: Object.keys(serviceCache)
  };
}

/**
 * Debug function to log service cache information
 * Only use during development
 */
export function debugServiceCache() {
  logger.info('Service cache debug information', {
    service: 'serviceInitializer',
    action: 'debugServiceCache',
    sendToServer: false,
    stats: getServiceStats()
  });
  
  console.log('==== SERVICE CACHE DEBUG ====');
  console.log(`Total created: ${serviceStats.created}`);
  console.log(`Total reused: ${serviceStats.reused}`);
  console.log(`Cache size: ${Object.keys(serviceCache).length}`);
  console.log('Cached services:');
  Object.keys(serviceCache).forEach(key => {
    console.log(`- ${key} (hits: ${serviceStats.cacheHits[key] || 0}, last created: ${serviceStats.lastCreated[key]})`);
  });
  console.log('============================');
} 