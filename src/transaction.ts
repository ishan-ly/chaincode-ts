/*
  SPDX-License-Identifier: Apache-2.0
*/

import {Object, Property} from 'fabric-contract-api';

@Object()
export class MemberTransaction {
    @Property()
    public docType?: string;

    @Property()
    public identifier: string;

    @Property()
    public memberId: string;

    @Property()
    public memberTier: string;

    @Property()
    public programId: number;

    @Property()
    public merchantId: number;

    @Property()
    public merchantStoreId: number;

    @Property()
    public location: string;

    @Property()
    public amount: number;

    @Property()
    public currency: string;

    @Property()
    public status: string; //['INITIALIZED','ACCURED','FAILED']

    @Property()
    public currencyToUsdRate : number;
}
