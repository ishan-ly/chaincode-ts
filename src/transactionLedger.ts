/*
 * SPDX-License-Identifier: Apache-2.0
*/
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {MemberTransaction} from './transaction';
import { ContractLedgerContract } from './contractLedger';

@Info({title: 'TransactionLedger', description: 'Smart contract for transaction done by a member of partner'})
export class TransactionLedgerContract extends Contract {

    // CreateTransaction issues a new transaction to the world state with given details.
    @Transaction()
    public async CreateTransaction(ctx: Context, transactionDetails : MemberTransaction): Promise<MemberTransaction> {
        if(!transactionDetails.identifier) throw new Error("identifier is required");
        if(!transactionDetails.memberId) throw new Error("memberId is required");
        if(!transactionDetails.memberTier) throw new Error("memberTier is required");
        if(!transactionDetails.programId) throw new Error("programId is required");
        if(!transactionDetails.merchantId) throw new Error("merchantId is required");
        if(!transactionDetails.merchantStoreId) throw new Error("merchantStoreId is required");
        if(!transactionDetails.location) throw new Error("location is required");
        if(!transactionDetails.amount) throw new Error("amount is required");
        if(!transactionDetails.currency) throw new Error("currency is required");
        if(!transactionDetails.currencyToUsdRate) throw new Error("currencyToUsdRate is required");

        const exists = await this.TransactionExists(ctx, transactionDetails.identifier);
        if (exists) {
            throw new Error(`The transaction ${transactionDetails.identifier} already exists`);
        }

        /**
        * 1. validations on input params => null check
        * 2. Fetch contract on basis of programid and merchantid
        * 3. calculate no of points based on on amount, currency and cpp
        */
        const contractLedgerContract = new ContractLedgerContract();
        const contracts = await contractLedgerContract.QueryContractsByProgramAndMerchant(ctx, transactionDetails.programId, transactionDetails.merchantId);
        if(!contracts) throw new Error(`NO contract between program ${transactionDetails.programId} and merchant ${transactionDetails.merchantId} exists`);
        const parsedContracts = JSON.parse(contracts);
        const cpp = parsedContracts[0].cpp;

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
            pointToBeIncurred : pointToBeIncurred,
            status : 'INITIALIZED'
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(transaction.identifier, Buffer.from(stringify(sortKeysRecursive(transaction))));
        return transaction;
    }

    //UPDATE STATUS FUNCTION -> CHANGE TO ACCURED OR FAILED
    @Transaction()
    public async UpdateStatus(ctx: Context, identifier : string, status : string) : Promise<MemberTransaction> {
        // Get the ledger state for the transaction
        const transactionBytes = await ctx.stub.getState(identifier);
        if (!transactionBytes || transactionBytes.length === 0) {
            throw new Error(`Transaction with ID ${identifier} does not exist.`);
        }

        // Parse the JSON data
        const transaction = JSON.parse(transactionBytes.toString());

        // Update the status field
        transaction.status = status;

        // Update the ledger state with the new transaction data
        await ctx.stub.putState(identifier, Buffer.from(stringify(sortKeysRecursive(transaction))));

        // Return the updated transaction
        return transaction;
    }

    // ReadTransaction returns the transaction stored in the world state with given id.
    @Transaction(false)
    public async ReadTransaction(ctx: Context, id: string): Promise<string> {
        const transactionJSON = await ctx.stub.getState(id); // get the transaction from chaincode state
        if (!transactionJSON || transactionJSON.length === 0) {
            throw new Error(`The transaction ${id} does not exist`);
        }
        return transactionJSON.toString();
    }

    // TransactionExists returns true when transaction with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async TransactionExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // GetAllContracts returns all contracts found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllTransactions(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all transctions in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // QueryContractsByMerchant queries for contracts based on a passed in merchant.
	// This is an example of a parameterized query where the query logic is baked into the chaincode,
	// and accepting a single query parameter (merchantID).
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Example: Parameterized rich query
    @Transaction(false)
	public async QueryTransactionsByMerchant(ctx : Context, merchantID : number) {
		let queryString : any;
		queryString.selector.docType = 'transaction';
		queryString.selector.MerchantID = merchantID;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    @Transaction(false)
    public async QueryTransactionsByMember(ctx : Context, memberId : string) {
		let queryString : any;
		queryString.selector.docType = 'transaction';
		queryString.selector.memberId = memberId;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    @Transaction(false)
	public async QueryTransactionsByProgram(ctx : Context, programId : number) {
		let queryString : any;
		queryString.selector.docType = 'transaction';
        queryString.selector.programId = programId;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    @Transaction(false)
	public async QueryTransactionsByMerchantStore(ctx : Context, merchantStoreId : number) {
		let queryString : any;
		queryString.selector.docType = 'transaction';
        queryString.selector.merchantStoreId = merchantStoreId;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    // GetQueryResultForQueryString executes the passed in query string.
	// Result set is built and returned as a byte array containing the JSON results.
    @Transaction(false)
	async GetQueryResultForQueryString(ctx : Context, queryString : any) {

		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		let results = await this._GetAllResults(resultsIterator, false);

		return JSON.stringify(results);
	}

    @Transaction(false)
    @Returns('array')
	async _GetAllResults(iterator, isHistory : boolean) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes : any;
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.txId;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}

    // GetTransactionHistory returns the chain of custody for an transaction since issuance.
    @Transaction(false)
    @Returns('string')
	async GetTransactionHistory(ctx : Context, assetName) {

		let resultsIterator = await ctx.stub.getHistoryForKey(assetName);
		let results = await this._GetAllResults(resultsIterator, true);

		return JSON.stringify(results);
	}

}
