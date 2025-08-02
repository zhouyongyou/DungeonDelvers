// api/listings.ts
// Vercel Serverless Function for handling marketplace listings

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage (in production, use Vercel KV or database)
const listings: MarketListing[] = [];

interface MarketListing {
    id: string;
    seller: string;
    nftType: 'hero' | 'relic' | 'party';
    tokenId: string;
    contractAddress: string;
    price: bigint;
    status: 'active' | 'sold' | 'cancelled';
    createdAt: number;
    updatedAt: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        switch (req.method) {
            case 'GET':
                return handleGetListings(req, res);
            case 'POST':
                return handleCreateListing(req, res);
            case 'PUT':
                return handleUpdateListing(req, res);
            case 'DELETE':
                return handleDeleteListing(req, res);
            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function handleGetListings(req: VercelRequest, res: VercelResponse) {
    const { status, seller, nftType, limit = '50', offset = '0' } = req.query;
    
    let filteredListings = [...listings];
    
    // Apply filters
    if (status) {
        filteredListings = filteredListings.filter(l => l.status === status);
    }
    if (seller) {
        filteredListings = filteredListings.filter(l => 
            l.seller.toLowerCase() === (seller as string).toLowerCase()
        );
    }
    if (nftType && nftType !== 'all') {
        filteredListings = filteredListings.filter(l => l.nftType === nftType);
    }
    
    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedListings = filteredListings.slice(offsetNum, offsetNum + limitNum);
    
    res.status(200).json({
        listings: paginatedListings,
        total: filteredListings.length,
        limit: limitNum,
        offset: offsetNum
    });
}

async function handleCreateListing(req: VercelRequest, res: VercelResponse) {
    const { seller, nftType, tokenId, contractAddress, price } = req.body;
    
    // Validation
    if (!seller || !nftType || !tokenId || !contractAddress || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if listing already exists for this NFT
    const existingListing = listings.find(l => 
        l.tokenId === tokenId && 
        l.contractAddress.toLowerCase() === contractAddress.toLowerCase() && 
        l.status === 'active'
    );
    
    if (existingListing) {
        return res.status(409).json({ error: 'Active listing already exists for this NFT' });
    }
    
    const newListing: MarketListing = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        seller: seller.toLowerCase(),
        nftType,
        tokenId,
        contractAddress: contractAddress.toLowerCase(),
        price: BigInt(price),
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    listings.push(newListing);
    
    res.status(201).json({ 
        message: 'Listing created successfully', 
        listing: {
            ...newListing,
            price: newListing.price.toString() // Convert BigInt to string for JSON
        }
    });
}

async function handleUpdateListing(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    const { price, status } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Listing ID is required' });
    }
    
    const listingIndex = listings.findIndex(l => l.id === id);
    
    if (listingIndex === -1) {
        return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listing = listings[listingIndex];
    
    // Update fields
    if (price !== undefined) {
        listing.price = BigInt(price);
    }
    if (status !== undefined) {
        listing.status = status;
    }
    
    listing.updatedAt = Date.now();
    
    res.status(200).json({ 
        message: 'Listing updated successfully',
        listing: {
            ...listing,
            price: listing.price.toString()
        }
    });
}

async function handleDeleteListing(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'Listing ID is required' });
    }
    
    const listingIndex = listings.findIndex(l => l.id === id);
    
    if (listingIndex === -1) {
        return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Mark as cancelled instead of deleting
    listings[listingIndex].status = 'cancelled';
    listings[listingIndex].updatedAt = Date.now();
    
    res.status(200).json({ message: 'Listing cancelled successfully' });
}