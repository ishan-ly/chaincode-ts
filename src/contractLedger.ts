/*
 * SPDX-License-Identifier: Apache-2.0
*/
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {SmartContract} from './contract';

@Info({title: 'ContractLedger', description: 'Smart contract for contract between program and partner'})
export class ContractLedgerContract extends Contract {

    // CreateContract issues a new contract to the world state with given details.
    @Transaction()
    public async CreateContract(ctx: Context, contractDetails : any): Promise<SmartContract> {
        if(!contractDetails.programId) throw new Error("programId is required");
        if(!contractDetails.merchantId) throw new Error("merchantId is required");
        if(!contractDetails.cpp) throw new Error("cpp is required");
        if(!contractDetails.validFrom) throw new Error("validFrom is required");
        if(!contractDetails.validUpto) throw new Error("validUpto is required");

        const contracts = await this.QueryContractsByProgramAndMerchant(ctx, contractDetails.programId, contractDetails.merchantId);
        const parsedContracts = JSON.parse(contracts);
        const size = parsedContracts.length || 0; 
        const suffix = size+1;

        const contract = {
            docType : 'contract',
            identifier: `${contractDetails.programId}/${contractDetails.merchantId}/${(new Date()).getFullYear()}/${suffix}`,
            programId : contractDetails.programId,
            merchantId: contractDetails.merchantId,
            cpp: contractDetails.cpp,
            contractType: contractDetails.contractType || 'default',
            validFrom: contractDetails.validFrom,
            validUpto: contractDetails.validUpto 
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(contract.identifier, Buffer.from(stringify(sortKeysRecursive(contract))));
        return contract;
    }   

    // ReadContract returns the contract stored in the world state with given identifier.
    @Transaction(false)
    public async ReadContract(ctx: Context, identifier: string): Promise<string> {
        const contractJSON = await ctx.stub.getState(identifier); // get the contract from chaincode state
        if (!contractJSON || contractJSON.length === 0) {
            throw new Error(`The contract ${identifier} does not exist`);
        }
        return contractJSON.toString();
    }

    // COntractExists returns true when contract with given identifier exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async ContractExists(ctx: Context, identifier: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(identifier);
        return assetJSON && assetJSON.length > 0;
    }

    // GetAllContracts returns all contracts found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllContracts(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all contracts in the chaincode namespace.
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
	public async QueryContractsByMerchant(ctx : Context, merchantId : number) {
		let queryString : any;
		queryString.selector.docType = 'contract';
		queryString.selector.merchantId = merchantId;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    @Transaction(false)
	public async QueryContractsByProgramAndMerchant(ctx : Context, programId : number, merchantId : number) {
		let queryString : any;
		queryString.selector.docType = 'contract';
        queryString.selector.programId = programId;
		queryString.selector.merchantId = merchantId;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

    @Transaction(false)
    public async QueryContractsByProgram(ctx : Context, programID : number) {
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

    // GetContractHistory returns the chain of custody for an contract since issuance.
    @Transaction(false)
    @Returns('string')
	async GetContractHistory(ctx : Context, contractName) {
		let resultsIterator = await ctx.stub.getHistoryForKey(contractName);
		let results = await this._GetAllResults(resultsIterator, true);
		return JSON.stringify(results);
	}
}
