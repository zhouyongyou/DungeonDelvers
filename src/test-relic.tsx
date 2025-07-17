// 測試聖物合約數據
import React from 'react';
import { useReadContract } from 'wagmi';
import { getContract } from './config/contracts';
import { bsc } from 'wagmi/chains';

export const TestRelic: React.FC = () => {
    const relicContract = getContract(bsc.id, 'relic');
    
    // 讀取總供應量
    const { data: totalSupply } = useReadContract({
        address: relicContract?.address,
        abi: relicContract?.abi,
        functionName: 'totalSupply',
    });
    
    // 嘗試讀取 tokenId 1 的擁有者
    const { data: owner1 } = useReadContract({
        address: relicContract?.address,
        abi: relicContract?.abi,
        functionName: 'ownerOf',
        args: [1n],
    });
    
    // 嘗試讀取 tokenId 1 的 URI
    const { data: uri1 } = useReadContract({
        address: relicContract?.address,
        abi: relicContract?.abi,
        functionName: 'tokenURI',
        args: [1n],
    });
    
    return (
        <div className="p-4 space-y-2">
            <h2 className="text-xl font-bold">聖物合約測試</h2>
            <p>合約地址: {relicContract?.address}</p>
            <p>總供應量: {totalSupply?.toString() || '0'}</p>
            <p>Token 1 擁有者: {owner1 || '無'}</p>
            <p>Token 1 URI: {uri1 || '無'}</p>
        </div>
    );
};