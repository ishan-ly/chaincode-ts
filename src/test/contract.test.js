import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
const expect = chai.expect;

import { Context } from 'fabric-contract-api';
import { ChaincodeStub } from 'fabric-shim';

import {ContractLedgerContract} from '../contractLedger.js';

let assert = sinon.assert;
chai.use(sinonChai);

describe('Contract Basic Tests', () => {
    let transactionContext, chaincodeStub, asset;
    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            function* internalGetStateByRange() {
            }

            return Promise.resolve(internalGetStateByRange());
        });

        contract = {
            //docType : 'contract',
            //identifier: `${contractDetails.programId}/${contractDetails.merchantId}/${(new Date()).getFullYear()}/${suffix}`,
            programId : 1,
            merchantId: 101,
            cpp: 0.5,
            contractType: 'default',
            validFrom: new Date('1970-01-01T00:00:00.000+00:00'),
            validUpto: new Date('2023-07-11T06:35:18.420+00:00') 
        };
    });

    describe('Test CreateContract', () => {
        it('should return error on CreateContract', async () => {
            chaincodeStub.putState.rejects('failed inserting key');

            let contractLedgerContract = new ContractLedgerContract();
            try {
                await contractLedgerContract.CreateContract(transactionContext, contract);
                assert.fail('CreateAsset should have failed');
            } catch(err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on CreateAsset', async () => {
            let contractLedgerContract = new ContractLedgerContract();

            await contractLedgerContract.CreateContract(transactionContext, contract);

            let ret = JSON.parse((await chaincodeStub.getState(``)).toString());
            expect(ret).to.eql(asset);
        });
    });

    describe('Test ReadContract', () => {
        it('should return error on ReadContract', async () => {
            let contractLedgerContract = new ContractLedgerContract();
            await contractLedgerContract.CreateContract(transactionContext, contract);

            try {
                await contractLedgerContract.ReadContract(transactionContext, `${contract.programId}/${contract.merchantId}/${(new Date()).getFullYear()}/1`);
                assert.fail('ReadAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The contract 1 does not exist');
            }
        });

        it('should return success on ReadContract', async () => {
            let contractLedgerContract = new ContractLedgerContract();
            await contractLedgerContract.CreateContract(transactionContext, contract);

            let ret = JSON.parse(await chaincodeStub.getState(`${contract.programId}/${contract.merchantId}/${(new Date()).getFullYear()}/1`));
            expect(ret).to.eql(asset);
        });
    });
})
