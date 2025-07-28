// Market Links Generator Utility
// Generate links to various NFT marketplaces

import { bsc } from 'wagmi/chains';
import type { AnyNft } from '../types/nft';

export interface MarketLink {
  name: string;
  url: string;
  icon?: string;
}

/**
 * Generate OKX NFT marketplace link
 * OKX is the primary marketplace for BSC NFTs
 */
export function getOKXMarketLink(contractAddress: string, tokenId?: string): string {
  // Base collection link
  const baseUrl = `https://www.okx.com/web3/nft/markets/collection/bscn/${contractAddress}`;
  
  // If tokenId is provided, link to specific NFT
  if (tokenId) {
    return `https://www.okx.com/web3/nft/markets/nft/bscn/${contractAddress}/${tokenId}`;
  }
  
  return baseUrl;
}

/**
 * Generate Element marketplace link
 * Element also supports BSC NFTs
 */
export function getElementMarketLink(contractAddress: string, tokenId?: string): string {
  // Element uses lowercase addresses
  const lowerAddress = contractAddress.toLowerCase();
  
  if (tokenId) {
    return `https://element.market/assets/bsc/${lowerAddress}/${tokenId}`;
  }
  
  return `https://element.market/collections/${lowerAddress}`;
}

/**
 * Generate OpenSea link (primarily for Base chain)
 */
export function getOpenSeaLink(contractAddress: string, tokenId?: string, chain: 'base' | 'ethereum' = 'base'): string {
  const lowerAddress = contractAddress.toLowerCase();
  
  if (tokenId) {
    return `https://opensea.io/assets/${chain}/${lowerAddress}/${tokenId}`;
  }
  
  return `https://opensea.io/collection/${lowerAddress}`;
}

/**
 * Get all available market links for a specific NFT
 */
export function getMarketLinks(nft: AnyNft, contractAddress: string, chainId: number): MarketLink[] {
  const links: MarketLink[] = [];
  
  // For BSC chain
  if (chainId === bsc.id) {
    // OKX is the primary marketplace for BSC
    links.push({
      name: 'OKX NFT',
      url: getOKXMarketLink(contractAddress, nft.id.toString()),
      icon: '🛒'
    });
    
    // Element as secondary option
    links.push({
      name: 'Element',
      url: getElementMarketLink(contractAddress, nft.id.toString()),
      icon: '🔷'
    });
  }
  
  // For Base chain (if supported in the future)
  if (chainId === 8453) { // Base chain ID
    links.push({
      name: 'OpenSea',
      url: getOpenSeaLink(contractAddress, nft.id.toString(), 'base'),
      icon: '🌊'
    });
  }
  
  return links;
}

/**
 * Get collection links (without specific tokenId)
 */
export function getCollectionMarketLinks(contractAddress: string, chainId: number): MarketLink[] {
  const links: MarketLink[] = [];
  
  if (chainId === bsc.id) {
    links.push({
      name: 'OKX NFT',
      url: getOKXMarketLink(contractAddress),
      icon: '🛒'
    });
    
    links.push({
      name: 'Element',
      url: getElementMarketLink(contractAddress),
      icon: '🔷'
    });
  }
  
  if (chainId === 8453) {
    links.push({
      name: 'OpenSea',
      url: getOpenSeaLink(contractAddress),
      icon: '🌊'
    });
  }
  
  return links;
}

/**
 * Generate a market button component props
 */
export function getMarketButtonProps(nft: AnyNft, contractAddress: string, chainId: number) {
  const primaryMarket = chainId === bsc.id ? 'OKX' : 'OpenSea';
  const primaryLink = chainId === bsc.id 
    ? getOKXMarketLink(contractAddress, nft.id.toString())
    : getOpenSeaLink(contractAddress, nft.id.toString());
  
  return {
    label: `View on ${primaryMarket}`,
    href: primaryLink,
    target: '_blank',
    rel: 'noopener noreferrer'
  };
}