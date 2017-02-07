/*
 * Copyright 2012-2015 Metamarkets Group Inc.
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Class, Instance, NamedArray, immutableEqual } from 'immutable-class';
import { PlyType, FullType } from '../types';
import * as hasOwnProp from 'has-own-prop';
import { Expression, ExpressionJS, RefExpression } from '../expressions/index';

export type Attributes = AttributeInfo[];
export type AttributeJSs = AttributeInfoJS[];

export interface AttributeInfoValue {
  special?: string;
  name: string;
  type?: PlyType;
  unsplitable?: boolean;
  maker?: Expression;

  // range
  separator?: string;
  rangeSize?: number;
  digitsBeforeDecimal?: int;
  digitsAfterDecimal?: int;
}

export interface AttributeInfoJS {
  special?: string;
  name: string;
  type?: PlyType;
  unsplitable?: boolean;
  maker?: ExpressionJS;

  // range
  separator?: string;
  rangeSize?: number;
  digitsBeforeDecimal?: int;
  digitsAfterDecimal?: int;
}

let check: Class<AttributeInfoValue, AttributeInfoJS>;
export class AttributeInfo implements Instance<AttributeInfoValue, AttributeInfoJS> {
  static isAttributeInfo(candidate: any): candidate is AttributeInfo {
    return candidate instanceof AttributeInfo;
  }

  static jsToValue(parameters: AttributeInfoJS): AttributeInfoValue {
    let value: AttributeInfoValue = {
      special: parameters.special,
      name: parameters.name
    };
    if (parameters.type) value.type = parameters.type;
    if (parameters.unsplitable) value.unsplitable = true;

    let maker = parameters.maker || (parameters as any).makerAction;
    if (maker) value.maker = Expression.fromJS(maker);
    return value;
  }

  static classMap: Lookup<typeof AttributeInfo> = {};
  static register(ex: typeof AttributeInfo): void {
    let special = (<any>ex).special.replace(/^\w/, (s: string) => s.toLowerCase());
    AttributeInfo.classMap[special] = ex;
  }

  static getConstructorFor(special: string): typeof AttributeInfo {
    const classFn = AttributeInfo.classMap[special];
    if (!classFn) return AttributeInfo;
    return classFn;
  }

  static fromJS(parameters: AttributeInfoJS): AttributeInfo {
    if (typeof parameters !== "object") {
      throw new Error("unrecognizable attributeMeta");
    }
    if (!hasOwnProp(parameters, 'special')) {
      return new AttributeInfo(AttributeInfo.jsToValue(parameters));
    }
    if (parameters.special === 'range') {
      throw new Error("'range' attribute info is no longer supported, you should apply the .extract('^\\d+') function instead");
    }
    let Class = AttributeInfo.getConstructorFor(parameters.special || '');
    if (!Class) {
      throw new Error(`unsupported special attributeInfo '${parameters.special}'`);
    }
    return Class.fromJS(parameters);
  }

  static fromJSs(attributeJSs: AttributeJSs): Attributes {
    if (!Array.isArray(attributeJSs)) throw new TypeError("invalid attributeJSs");
    return attributeJSs.map(attributeJS => AttributeInfo.fromJS(attributeJS));
  }

  static toJSs(attributes: Attributes): AttributeJSs {
    return attributes.map(attribute => attribute.toJS());
  }

  static override(attributes: Attributes, attributeOverrides: Attributes): Attributes {
    return NamedArray.overridesByName(attributes, attributeOverrides);
  }

  static fromValue(parameters: AttributeInfoValue): AttributeInfo {
    const { special } = parameters;
    let ClassFn = AttributeInfo.getConstructorFor(special || '') as any;
    return new ClassFn(parameters);
  }


  public special: string;
  public name: string;
  public type: PlyType;
  public datasetType?: Lookup<FullType>;
  public unsplitable: boolean;
  public maker?: Expression;

  constructor(parameters: AttributeInfoValue) {
    this.special = parameters.special;

    if (typeof parameters.name !== "string") {
      throw new Error("name must be a string");
    }
    this.name = parameters.name;
    this.type = parameters.type || 'STRING';
    if (!RefExpression.validType(this.type)) throw new Error(`invalid type: ${this.type}`);

    this.unsplitable = Boolean(parameters.unsplitable);
    this.maker = parameters.maker;
  }

  public _ensureSpecial(special: string) {
    if (!this.special) {
      this.special = special;
      return;
    }
    if (this.special !== special) {
      throw new TypeError(`incorrect attributeInfo special '${this.special}' (needs to be: '${special}')`);
    }
  }

  public toString(): string {
    let special = this.special ? `[${this.special}]` : '';
    return `${this.name}::${this.type}${special}`;
  }

  public valueOf(): AttributeInfoValue {
    return {
      name: this.name,
      type: this.type,
      unsplitable: this.unsplitable,
      special: this.special,
      maker: this.maker
    };
  }

  public toJS(): AttributeInfoJS {
    let js: AttributeInfoJS = {
      name: this.name,
      type: this.type
    };
    if (this.special) {
      js.special = this.special;
    } else {
      if (this.unsplitable) js.unsplitable = true;
    }
    if (this.maker) js.maker = this.maker.toJS();
    return js;
  }

  public toJSON(): AttributeInfoJS {
    return this.toJS();
  }

  public equals(other: AttributeInfo): boolean {
    return other instanceof AttributeInfo &&
      this.special === other.special &&
      this.name === other.name &&
      this.type === other.type &&
      this.unsplitable === other.unsplitable &&
      immutableEqual(this.maker, other.maker);
  }

  public serialize(value: any): any {
    return value;
  }

  public dumpMaker(): AttributeInfo {
    if (!this.maker) return this;
    let value = this.valueOf();
    value.maker = null;
    return AttributeInfo.fromValue(value);
  }

  public change(propertyName: string, newValue: any): AttributeInfo {
    let v = this.valueOf();

    if (!hasOwnProp(v, propertyName)) {
      throw new Error(`Unknown property: ${propertyName}`);
    }

    (v as any)[propertyName] = newValue;
    return AttributeInfo.fromValue(v);
  }

  public getUnsplitable(): boolean {
    return this.unsplitable;
  }

  public changeUnsplitable(unsplitable: boolean): AttributeInfo {
    let value = this.valueOf();
    value.unsplitable = unsplitable;
    return AttributeInfo.fromValue(value);
  }
}
check = AttributeInfo;


export class UniqueAttributeInfo extends AttributeInfo {
  static special = 'unique';
  static fromJS(parameters: AttributeInfoJS): UniqueAttributeInfo {
    return new UniqueAttributeInfo(AttributeInfo.jsToValue(parameters));
  }

  constructor(parameters: AttributeInfoValue) {
    super(parameters);
    this._ensureSpecial("unique");
    this.type = 'STRING';
    this.unsplitable = true;
  }

  public serialize(value: any): string {
    throw new Error("can not serialize an approximate unique value");
  }

  public getUnsplitable(): boolean {
    return true;
  }
}
AttributeInfo.register(UniqueAttributeInfo);


export class ThetaAttributeInfo extends AttributeInfo {
  static special = 'theta';
  static fromJS(parameters: AttributeInfoJS): ThetaAttributeInfo {
    return new ThetaAttributeInfo(AttributeInfo.jsToValue(parameters));
  }

  constructor(parameters: AttributeInfoValue) {
    super(parameters);
    this._ensureSpecial("theta");
    this.type = 'STRING';
    this.unsplitable = true;
  }

  public serialize(value: any): string {
    throw new Error("can not serialize a theta value");
  }

  public getUnsplitable(): boolean {
    return true;
  }
}
AttributeInfo.register(ThetaAttributeInfo);


export class HistogramAttributeInfo extends AttributeInfo {
  static special = 'histogram';
  static fromJS(parameters: AttributeInfoJS): HistogramAttributeInfo {
    return new HistogramAttributeInfo(AttributeInfo.jsToValue(parameters));
  }

  constructor(parameters: AttributeInfoValue) {
    super(parameters);
    this._ensureSpecial("histogram");
    this.type = 'NUMBER';
    this.unsplitable = true;
  }

  public serialize(value: any): string {
    throw new Error("can not serialize a histogram value");
  }

  public getUnsplitable(): boolean {
    return true;
  }
}
AttributeInfo.register(HistogramAttributeInfo);
