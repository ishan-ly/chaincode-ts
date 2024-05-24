export interface TransactionDetails {
    identifier : string;
    memberId : number;
    memberTier : string;
    programId : number;
    merchantId : number;
    merchantStoreId : number;
    location : string;
    amount : number;
    currency : string;
    currencyToUsdRate : number;
}

