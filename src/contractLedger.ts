/*
 * SPDX-License-Identifier: Apache-2.0
*/
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {SmartContract} from './contract';
import { CommonUtils } from './utils/CommonUtils';
import { InvalidInputError } from './errors/InvalidInputError';
import { CustomError } from './errors/CustomError';
import { ContractDetails } from './interface/ContractDetails';
@Info({title: 'ContractLedger', description: 'Smart contract for contract between program and partner'})
export class ContractLedgerContract extends Contract {

    // CreateContract issues a new contract to the world state with given details.
    @Transaction()
    public async CreateContract(ctx: Context, contractDetails : string) {
        try {
            const parsedDetails : ContractDetails = JSON.parse(contractDetails);
            if(!parsedDetails.programId) throw new InvalidInputError("programId is required");
            if(!parsedDetails.merchantId) throw new InvalidInputError("merchantId is required");
            if(!parsedDetails.cpp) throw new InvalidInputError("cpp is required");
            if(!parsedDetails.validFrom) throw new InvalidInputError("validFrom is required");
            if(!parsedDetails.validUpto) throw new InvalidInputError("validUpto is required");
    
            const contracts = await this.QueryContractsByProgramAndMerchant(ctx, parsedDetails.programId, parsedDetails.merchantId);
            const parsedContracts = JSON.parse(contracts);
            const size = parsedContracts.length || 0; 
            const suffix = size+1;
    
            const contract = {
                docType : 'contract',
                identifier: `${parsedDetails.programId}/${parsedDetails.merchantId}/${(new Date()).getFullYear()}/${suffix}`,
                programId : parsedDetails.programId,
                merchantId: parsedDetails.merchantId,
                cpp: parsedDetails.cpp,
                contractType: parsedDetails.contractType || 'default',
                validFrom: parsedDetails.validFrom,
                validUpto: parsedDetails.validUpto 
            };
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            await ctx.stub.putState(contract.identifier, Buffer.from(stringify(sortKeysRecursive(contract))));
            return contract;
        } catch (error) {
            console.log(error);
        }
    }   

    // ReadContract returns the contract stored in the world state with given identifier.
    @Transaction(false)
    public async ReadContract(ctx: Context, identifier: string): Promise<string> {
        try {
            const contractJSON = await ctx.stub.getState(identifier); // get the contract from chaincode state
            if (!contractJSON || contractJSON.length === 0) {
                throw new CustomError(`The contract ${identifier} does not exist`);
            }
            return contractJSON.toString();
        } catch (error) {
            console.log(error);
        }
    }

    // COntractExists returns true when contract with given identifier exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async ContractExists(ctx: Context, identifier: string): Promise<boolean> {
        try {
            const assetJSON = await ctx.stub.getState(identifier);
            return assetJSON && assetJSON.length > 0;
        } catch (error) {
            console.log(error);
        }
    }

    // GetAllContracts returns all contracts found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllContracts(ctx: Context, type : string): Promise<string> {
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
    @Transaction(false)
	public async QueryContractsByMerchant(ctx : Context, merchantId : number) {
		try {
            let queryString : any;
            queryString.selector.docType = 'contract';
            queryString.selector.merchantId = merchantId;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults)
        } catch (error) {
            console.log(error);
        };
	}

    @Transaction(false)
	public async QueryContractsByProgramAndMerchant(ctx : Context, programId : number, merchantId : number) {
		try {
            let queryString : any;
            queryString.selector.docType = 'contract';
            queryString.selector.programId = programId;
            queryString.selector.merchantId = merchantId;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
	}

    @Transaction(false)
    public async QueryContractsByProgram(ctx : Context, programID : number) {
		try {
            let queryString : any;
            queryString.selector.docType = 'contract';
            queryString.selector.ProgramID = programID;
            return await CommonUtils.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
        } catch (error) {
            console.log(error);
        }
	}

    // GetContractHistory returns the chain of custody for an contract since issuance.
    @Transaction(false)
    @Returns('string')
	async GetContractHistory(ctx : Context, contractName) {
        try {
            return await CommonUtils.GetHistoryForKey(ctx, contractName);
        } catch (error) {
            console.log(error);
        }
	}
}
