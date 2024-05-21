import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import { CustomResponse } from "../models/CustomResponse";

export class CommonUtils {
    @Transaction(false)
    @Returns('array')
	static async _GetAllResults(iterator, isHistory : boolean) {
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

    // GetQueryResultForQueryString executes the passed in query string.
	// Result set is built and returned as a byte array containing the JSON results.
    @Transaction(false)
	static async GetQueryResultForQueryString(ctx : Context, queryString : any) {

		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		let results = await this._GetAllResults(resultsIterator, false);

		return JSON.stringify(results);
	}

    // GetContractHistory returns the chain of custody for an contract since issuance.
    @Transaction(false)
    @Returns('string')
	static async GetHistoryForKey(ctx : Context, key) {
		let resultsIterator = await ctx.stub.getHistoryForKey(key);
		let results = await this._GetAllResults(resultsIterator, true);
		return JSON.stringify(results);
	}

    // GetAllData returns all data found in the world state for the particular docType.
    @Transaction(false)
    @Returns('string')
    static async GetAllData(ctx: Context, type : string): Promise<string> {
        let queryString : any;
		queryString.selector.docType = type;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
    }

    static prepareErrorMessage(error: any) {
        console.error(error);
        switch (error.name) {
            case 'UnauthorisedError':
                return new CustomResponse(401, error.message, null, null);
            case 'ReferenceError':
                return new CustomResponse(400, error.message, null, null);
            case 'InvalidInputError':
                return new CustomResponse(400, error.message, null, null);
            case 'CustomError':
                return new CustomResponse(422, error.message, null, null);
            default:
                return new CustomResponse(500, 'Ohh, something went wrong.', null, null);
        }
    }

}


