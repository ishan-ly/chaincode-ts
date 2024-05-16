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
    public async CreateTransaction(ctx: Context, transactionDetails : MemberTransaction): Promise<void> {
        // const exists = await this.AssetExists(ctx, id);
        // if (exists) {
        //     throw new Error(`The asset ${id} already exists`);
        // }
        const contractLedgerContract = new ContractLedgerContract();
        const contract = await contractLedgerContract.QueryContractsByProgramAndMerchant(ctx, transactionDetails.programId, transactionDetails.merchantId);

    /**
        * 1. validations on input params => null check
        * 2. Fetch contract on basis of programid and merchantid
        * 2. calculate no of points based on on amount, currency and cpp
    */
        const transaction = {
            identifier : id, 
            memberId : memberId,
            memberTier : memberTier,
            programId : programId,
            merchantId : merchantId,
            merchantStoreId : merchantStoreId,
            location : location,
            amount : amount,
            currency : currency,
            pointToBeIncurred : '',//calculate from formula shared
            status : 'INITIALIZED'//['INITIALIZED ','ACCURED', 'FAILED']
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(transaction))));
    }

    //UPDATE STATUS FUNCTION -> CHANGE TO ACCRED OR FAILED

    // ReadTransaction returns the transaction stored in the world state with given id.
    @Transaction(false)
    public async ReadTransaction(ctx: Context, id: string): Promise<string> {
        const contractJSON = await ctx.stub.getState(id); // get the transaction from chaincode state
        if (!contractJSON || contractJSON.length === 0) {
            throw new Error(`The transaction ${id} does not exist`);
        }
        return contractJSON.toString();
    }

    // AssetExists returns true when asset with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // GetAllContracts returns all contracts found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllContracts(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
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
	async QueryContractsByMerchant(ctx : Context, merchantID : number) {
		let queryString : any;
		queryString.selector.docType = 'transaction';
		queryString.selector.MerchantID = merchantID;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    @Transaction(false)
    async QueryContractsByProgram(ctx : Context, programID : number) {
		let queryString : any;
		queryString.selector.docType = 'contract';
		queryString.selector.ProgramID = programID;
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
	async QueryTransactionsByProgramAndMerchant(ctx : Context, programId : number, merchantId : number) {
		let queryString : any;
		queryString.selector.docType = 'contract';
        queryString.selector.programId = programId;
		queryString.selector.merchantId = merchantId;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    // This is JavaScript so without Funcation Decorators, all functions are assumed
	// to be transaction functions
	//
	// For internal functions... prefix them with _
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

    // GetAssetHistory returns the chain of custody for an asset since issuance.
    @Transaction(false)
    @Returns('string')
	async GetAssetHistory(ctx, assetName) {

		let resultsIterator = await ctx.stub.getHistoryForKey(assetName);
		let results = await this._GetAllResults(resultsIterator, true);

		return JSON.stringify(results);
	}

}
