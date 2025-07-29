// usePartyValidation.ts - 隊伍存在性驗證 Hook
import { useReadContracts } from 'wagmi';
import { getContractWithABI } from '../config/contractsWithABI';
import { bsc } from 'wagmi/chains';
import { logger } from '../utils/logger';

interface PartyValidationOptions {
    partyIds: bigint[];
    enabled?: boolean;
}

export const usePartyValidation = ({ partyIds, enabled = true }: PartyValidationOptions) => {
    const partyContract = getContractWithABI('PARTY');

    // 批量檢查隊伍存在性
    const contracts = partyIds.map(partyId => ({
        address: partyContract?.address as `0x${string}`,
        abi: partyContract?.abi,
        functionName: 'ownerOf',
        args: [partyId],
    }));

    const { data: validationResults, isLoading } = useReadContracts({
        contracts,
        query: {
            enabled: enabled && !!partyContract && partyIds.length > 0,
            staleTime: 1000 * 60 * 5, // 5分鐘緩存
        }
    });

    // 處理驗證結果
    const validParties = partyIds.filter((partyId, index) => {
        const result = validationResults?.[index];
        const isValid = result?.status === 'success' && result?.result;
        
        if (!isValid) {
            logger.warn(`隊伍 #${partyId.toString()} 不存在或無法訪問`, {
                partyId: partyId.toString(),
                status: result?.status,
                error: result?.error?.message
            });
        }
        
        return isValid;
    });

    const invalidParties = partyIds.filter(partyId => !validParties.includes(partyId));

    return {
        validParties,
        invalidParties,
        isValidating: isLoading,
        totalChecked: partyIds.length,
        validCount: validParties.length,
        invalidCount: invalidParties.length,
    };
};