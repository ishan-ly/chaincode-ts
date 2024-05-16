/*
  SPDX-License-Identifier: Apache-2.0
*/

import {Object, Property} from 'fabric-contract-api';

@Object()
export class SmartContract {
    @Property()
    public docType?: string;

    @Property()
    public identifier: string;

    @Property()
    public programId: number;

    @Property()
    public merchantId: number;

    @Property()
    public cpp: number;

    @Property()
    public contractType: string;

    @Property()
    public validFrom: Date;

    @Property()
    public validUpto: Date;
}
