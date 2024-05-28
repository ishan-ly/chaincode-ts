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
import { TransactionDetails } from './interface/TransactionDetails';
import { Status } from './enums/Status';
@Info({title: 'TransactionLedger', description: 'Smart contract for transaction done by a member of partner'})
export class TransactionLedgerContract extends Contract {

    // CreateTransaction issues a new transaction to the world state with given details.
    public async CreateTransaction(ctx: Context, transactionDetails : string): Promise<string> {
        try {
            const parsedDetails : TransactionDetails = JSON.parse(transactionDetails);
            if(!parsedDetails.identifier) throw new InvalidInputError("identifier is required");
            if(!parsedDetails.memberId) throw new InvalidInputError("memberId is required");
            if(!parsedDetails.memberTier) throw new InvalidInputError("memberTier is required");
            if(!parsedDetails.programId) throw new InvalidInputError("programId is required");
            if(!parsedDetails.merchantId) throw new InvalidInputError("merchantId is required");
            if(!parsedDetails.merchantStoreId) throw new InvalidInputError("merchantStoreId is required");
            if(!parsedDetails.location) throw new InvalidInputError("location is required");
            if(!parsedDetails.amount) throw new InvalidInputError("amount is required");
            if(!parsedDetails.currency) throw new InvalidInputError("currency is required");
            if(!parsedDetails.currencyToUsdRate) throw new InvalidInputError("currencyToUsdRate is required");
    
            const exists = await this.TransactionExists(ctx, parsedDetails.identifier);
            if (exists) {
                throw new CustomError(`The transaction ${parsedDetails.identifier} already exists`);
            }
    
            const contractLedgerContract = new ContractLedgerContract();
            const contracts = await contractLedgerContract.QueryContractsByProgramAndMerchant(ctx, parsedDetails.programId, parsedDetails.merchantId);
            
            if(!contracts) throw new CustomError(`NO contract between program ${parsedDetails.programId} and merchant ${parsedDetails.merchantId} exists`);
            const parsedContracts = JSON.parse(contracts);

            if(parsedContracts.length <= 0) throw new CustomError("No Contract found");

            const cpp = parsedContracts[0].cpp;
            if(cpp === 0) throw new CustomError("cpp cannot be 0");

            const interimAmount = parsedDetails.amount * parsedDetails.currencyToUsdRate;
            const pointToBeAccured = interimAmount/cpp;

            const transaction = {
                docType : 'transaction',
                identifier : parsedDetails.identifier, 
                memberId : parsedDetails.memberId,
                memberTier : parsedDetails.memberTier,
                programId : parsedDetails.programId,
                merchantId : parsedDetails.merchantId,
                merchantStoreId : parsedDetails.merchantStoreId,
                location : parsedDetails.location,
                amount : parsedDetails.amount,
                currency : parsedDetails.currency,
                currencyToUsdRate : parsedDetails.currencyToUsdRate,
                pointToBeAccured : pointToBeAccured.toFixed(2),
                status : Status.INITIALIZED
            };
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            await ctx.stub.putState(transaction.identifier, Buffer.from(stringify(sortKeysRecursive(transaction))));
            return JSON.stringify(transaction);
        } catch (error) {
            console.error(error); 
            const customError = new CustomError(error.message);
            console.log(customError);
            throw customError;
        }
    }

    //UPDATE STATUS FUNCTION -> CHANGE TO ACCURED OR FAILED
    public async UpdateStatus(ctx: Context, identifier : string, status : string) : Promise<string> {
        try {
            // Get the ledger state for the transaction
            const transactionBytes = await ctx.stub.getState(identifier);
            if (!transactionBytes || transactionBytes.length === 0) {
                throw new CustomError(`Transaction with ID ${identifier} does not exist.`);
            }
    
            // Parse the JSON data
            const transaction = JSON.parse(transactionBytes.toString());
    
            // Update the status field
            transaction.status = parseInt(status);
    
            // Update the ledger state with the new transaction data
            await ctx.stub.putState(identifier, Buffer.from(stringify(sortKeysRecursive(transaction))));
    
            // Return the updated transaction
            return JSON.stringify(transaction);
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);
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
            throw new CustomError(error.message);
        }
    }

    // TransactionExists returns true when transaction with given ID exists in world state.
    public async TransactionExists(ctx: Context, id: string): Promise<boolean> {
        try {
            const assetJSON = await ctx.stub.getState(id);
            return assetJSON && assetJSON.length > 0;
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);

        }
    }

    // GetAllContracts returns all contracts found in the world state.
    public async GetAllTransactions(ctx: Context, type: string): Promise<string> {
		try {
            return await CommonUtils.GetAllData(ctx, type); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);

        }
    }

    // QueryContractsByMerchant queries for contracts based on a passed in merchant.
	// This is an example of a parameterized query where the query logic is baked into the chaincode,
	// and accepting a single query parameter (merchantID).
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Example: Parameterized rich query
	public async QueryTransactionsByMerchant(ctx : Context, merchantIdString : string) : Promise<string> {
		try {
            const merchantId = parseInt(merchantIdString);
            let queryString: any = {
                selector: {
                    docType: 'transaction',
                    merchantId: merchantId
                }
            };
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);
        }
	}

    public async QueryTransactionsByMember(ctx : Context, memberIdString : string) : Promise<string> {
		try {
            const memberId = parseInt(memberIdString);
            let queryString: any = {
                selector: {
                    docType: 'transaction',
                    memberId: memberId
                }
            };
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);
        }
	}

	public async QueryTransactionsByProgram(ctx : Context, programIdString : string) : Promise<string> {
		try {
            const programId = parseInt(programIdString);
            let queryString: any = {
                selector: {
                    docType: 'transaction',
                    programId: programId
                }
            };
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);

        }
	}

	public async QueryTransactionsByMerchantStore(ctx : Context, merchantStoreIdString : string) : Promise<string>{
		try {
            const merchantStoreId = parseInt(merchantStoreIdString);
            let queryString: any = {
                selector: {
                    docType: 'transaction',
                    merchantStoreId: merchantStoreId
                }
            };
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
            throw new CustomError(error.message);

        }
	}

    // GetTransactionHistory returns the chain of custody for an transaction since issuance.
	async GetTransactionHistory(ctx : Context, transactionName : string) : Promise<string>{
       try {
            return await CommonUtils.GetHistoryForKey(ctx, transactionName);
       } catch (error) {
            console.log(error);
            throw new CustomError(error.message);
       }
	}
}
