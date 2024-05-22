/*
 * SPDX-License-Identifier: Apache-2.0
*/
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {MemberTransaction} from './transaction';
import { ContractLedgerContract } from './contractLedger';
import { CommonUtils } from './utils/CommonUtils';
import { InvalidInputError } from './errors/InvalidInputError';
import { CustomError } from './errors/CustomError';

@Info({title: 'TransactionLedger', description: 'Smart contract for transaction done by a member of partner'})
export class TransactionLedgerContract extends Contract {

    // CreateTransaction issues a new transaction to the world state with given details.
    public async CreateTransaction(ctx: Context, transactionDetails : any): Promise<MemberTransaction> {
        try {
            transactionDetails = JSON.parse(transactionDetails);
            if(!transactionDetails.identifier) throw new InvalidInputError("identifier is required");
            if(!transactionDetails.memberId) throw new InvalidInputError("memberId is required");
            if(!transactionDetails.memberTier) throw new InvalidInputError("memberTier is required");
            if(!transactionDetails.programId) throw new InvalidInputError("programId is required");
            if(!transactionDetails.merchantId) throw new InvalidInputError("merchantId is required");
            if(!transactionDetails.merchantStoreId) throw new InvalidInputError("merchantStoreId is required");
            if(!transactionDetails.location) throw new InvalidInputError("location is required");
            if(!transactionDetails.amount) throw new InvalidInputError("amount is required");
            if(!transactionDetails.currency) throw new InvalidInputError("currency is required");
            if(!transactionDetails.currencyToUsdRate) throw new InvalidInputError("currencyToUsdRate is required");
    
            const exists = await this.TransactionExists(ctx, transactionDetails.identifier);
            if (exists) {
                throw new CustomError(`The transaction ${transactionDetails.identifier} already exists`);
            }
    
            const contractLedgerContract = new ContractLedgerContract();
            const contracts = await contractLedgerContract.QueryContractsByProgramAndMerchant(ctx, transactionDetails.programId, transactionDetails.merchantId);
            
            if(!contracts) throw new CustomError(`NO contract between program ${transactionDetails.programId} and merchant ${transactionDetails.merchantId} exists`);
            const parsedContracts = JSON.parse(contracts);
            const cpp = parsedContracts[0].cpp;

            if(cpp === 0) throw new CustomError("cpp cannot be 0");
            const interimAmount = transactionDetails.amount * transactionDetails.currencyToUsdRate;
            const pointToBeIncurred = interimAmount/cpp;
    
            const transaction = {
                docType : 'transaction',
                identifier : transactionDetails.identifier, 
                memberId : transactionDetails.memberId,
                memberTier : transactionDetails.memberTier,
                programId : transactionDetails.programId,
                merchantId : transactionDetails.merchantId,
                merchantStoreId : transactionDetails.merchantStoreId,
                location : transactionDetails.location,
                amount : transactionDetails.amount,
                currency : transactionDetails.currency,
                currencyToUsdRate : transactionDetails.currencyToUsdRate,
                pointToBeIncurred : pointToBeIncurred.toFixed(2),
                status : 'INITIALIZED'
            };
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            await ctx.stub.putState(transaction.identifier, Buffer.from(stringify(sortKeysRecursive(transaction))));
            return transaction;
        } catch (error) {
            console.log(error);
        }
    }

    //UPDATE STATUS FUNCTION -> CHANGE TO ACCURED OR FAILED
    public async UpdateStatus(ctx: Context, identifier : string, status : string) : Promise<MemberTransaction> {
        try {
            // Get the ledger state for the transaction
            const transactionBytes = await ctx.stub.getState(identifier);
            if (!transactionBytes || transactionBytes.length === 0) {
                throw new CustomError(`Transaction with ID ${identifier} does not exist.`);
            }
    
            // Parse the JSON data
            const transaction = JSON.parse(transactionBytes.toString());
    
            // Update the status field
            transaction.status = status;
    
            // Update the ledger state with the new transaction data
            await ctx.stub.putState(identifier, Buffer.from(stringify(sortKeysRecursive(transaction))));
    
            // Return the updated transaction
            return transaction;
        } catch (error) {
            console.log(error);
        }
    }

    // ReadTransaction returns the transaction stored in the world state with given id.
    public async ReadTransaction(ctx: Context, id: string): Promise<string> {
        try {
            const transactionJSON = await ctx.stub.getState(id); // get the transaction from chaincode state
            if (!transactionJSON || transactionJSON.length === 0) {
                throw new CustomError(`The transaction ${id} does not exist`);
            }
            return transactionJSON.toString();
        } catch (error) {
            console.log(error);
        }
    }

    // TransactionExists returns true when transaction with given ID exists in world state.
    public async TransactionExists(ctx: Context, id: string): Promise<boolean> {
        try {
            const assetJSON = await ctx.stub.getState(id);
            return assetJSON && assetJSON.length > 0;
        } catch (error) {
            console.log(error);
        }
    }

    // GetAllContracts returns all contracts found in the world state.
    public async GetAllTransactions(ctx: Context, type: string): Promise<string> {
		try {
            return await CommonUtils.GetAllData(ctx, type); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
    }

    // QueryContractsByMerchant queries for contracts based on a passed in merchant.
	// This is an example of a parameterized query where the query logic is baked into the chaincode,
	// and accepting a single query parameter (merchantID).
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Example: Parameterized rich query
	public async QueryTransactionsByMerchant(ctx : Context, merchantID : number) {
		try {
            let queryString : any;
            queryString.selector.docType = 'transaction';
            queryString.selector.MerchantID = merchantID;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
	}

    public async QueryTransactionsByMember(ctx : Context, memberId : string) {
		try {
            let queryString : any;
            queryString.selector.docType = 'transaction';
            queryString.selector.memberId = memberId;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
	}

	public async QueryTransactionsByProgram(ctx : Context, programId : number) {
		try {
            let queryString : any;
            queryString.selector.docType = 'transaction';
            queryString.selector.programId = programId;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
	}

	public async QueryTransactionsByMerchantStore(ctx : Context, merchantStoreId : number) {
		try {
            let queryString : any;
            queryString.selector.docType = 'transaction';
            queryString.selector.merchantStoreId = merchantStoreId;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
	}

    // GetTransactionHistory returns the chain of custody for an transaction since issuance.
	async GetTransactionHistory(ctx : Context, transactionName) {
       try {
            return await CommonUtils.GetHistoryForKey(ctx, transactionName);
       } catch (error) {
            console.log(error);
       }
	}
}
