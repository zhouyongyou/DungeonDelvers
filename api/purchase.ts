// api/purchase.ts
// Vercel Serverless Function for handling NFT purchases

import type { VercelRequest, VercelResponse } from '@vercel/node';

// In production, this would be shared with listings.ts or use a database
let listings: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { listingId, buyer, txHash } = req.body;
        
        // Validation
        if (!listingId || !buyer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Find the listing
        const listingIndex = listings.findIndex(l => 
            l.id === listingId && l.status === 'active'
        );
        
        if (listingIndex === -1) {
            return res.status(404).json({ error: 'Listing not found or no longer available' });
        }
        
        const listing = listings[listingIndex];
        
        // Prevent self-purchase
        if (listing.seller.toLowerCase() === buyer.toLowerCase()) {
            return res.status(400).json({ error: 'Cannot purchase your own listing' });
        }
        
        // Mark listing as sold
        listing.status = 'sold';
        listing.updatedAt = Date.now();
        listing.buyer = buyer.toLowerCase();
        listing.soldAt = Date.now();
        
        if (txHash) {
            listing.txHash = txHash;
        }
        
        // In a real implementation, you would:
        // 1. Verify the transaction on-chain
        // 2. Update user balances
        // 3. Transfer NFT ownership
        // 4. Record the transaction in the database
        
        res.status(200).json({
            message: 'Purchase completed successfully',
            transaction: {
                listingId,
                seller: listing.seller,
                buyer: buyer.toLowerCase(),
                nftType: listing.nftType,
                tokenId: listing.tokenId,
                price: listing.price.toString(),
                txHash,
                completedAt: listing.soldAt
            }
        });
        
    } catch (error) {
        console.error('Purchase Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}