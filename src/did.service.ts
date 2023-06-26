import { Injectable } from '@nestjs/common';
import { Signer, BigNumber, ethers } from 'ethers';
import { keccak_256 } from 'js-sha3';
import { IResolver, NameController, NameRegistry } from 'hkid-sdk/contracts';
import { setupNameRegistry } from 'hkid-sdk/HKNameRegistrySDK';
import { config } from 'dotenv';

export type HexAddress = string;
export type TokenId = string;
export type DomainString = string;
export type LabelString = string;

config();
@Injectable()
export class DIDService {
  private readonly registryAddress: string;
  private readonly controllerAddress: string;
  private readonly provider: Signer;
  private readonly registry: NameRegistry;
  private readonly controller: NameController;

  constructor() {
    this.registryAddress = "0x6248cF19321a354a970b99e811C979A18b4e6446";
    this.controllerAddress = "0xc13cA34ed99CA845001798aEeDd868A30D839D7a";
    // 在此处初始化您的 provider，例如通过 ethers.js 进行初始化
    const provider = new ethers.providers.JsonRpcProvider('https://rpc.debugchain.net');
    const signer: ethers.Signer = new ethers.Wallet(process.env.PK).connect(provider);
    const { registry, controller } = setupNameRegistry(this.registryAddress, this.controllerAddress, signer);
    this.registry = registry;
    this.controller = controller;
  }

  private sha3(data: string): string {
    return "0x" + keccak_256(data);
  } 

  private getNamehash(name: string): string {
    let node = "0000000000000000000000000000000000000000000000000000000000000000";

    if (name) {
      let labels = name.split(".");

      for (let i = labels.length - 1; i >= 0; i--) {
        let labelSha = keccak_256(labels[i]);
        node = keccak_256(Buffer.from(node + labelSha, "hex"));
      }
    }

    return "0x" + node;
  }
  private toChecksumAddress(address: string): string {
    address = address.toLowerCase().replace("0x", "");
    const hash = keccak_256(address);
    let ret = "0x";
    for (let i = 0; i < address.length; i++) {
      if (parseInt(hash[i], 16) > 7) {
        ret += address[i].toUpperCase();
      } else {
        ret += address[i];
      }
    }
    return ret;
  }

  private suffixTld(label: DomainString): DomainString {
  return label.replace(".hk", "") + ".hk";
  }

  private removeTld(label: DomainString): DomainString {
    return label.replace(".hk", "");
  }
  
  private readonly emptyAddress = "0x0000000000000000000000000000000000000000";
  private readonly weirdNode = "0x0000000000000000000000000000000000000000000000000000000000000001";
  private readonly emptyNode = "0x0000000000000000000000000000000000000000000000000000000000000000";
  private readonly nonode = "0x0000000000000000000000000000000000000000000000000000000000001234";

  private readonly keylist = [
    "eth",
    "btc",
    "dot",
    "nft",
    "ipv4",
    "ipv6",
    "nostr",
    "cname",
    "contenthash",
    "profile.email",
    "profile.url",
    "profile.avatar",
    "profile.description",
    "social.twitter",
    "social.github",
  ];


  public async getFee(controller: any, name: string, duration: number): Promise<BigNumber> {
    return controller.registerPrice(name, duration);
  }

  public async nameRegister(controller: any, name: string, addr: HexAddress, duration: number): Promise<string> {
    let fee = await this.getFee(controller, name, duration);
    return controller.nameRegister(name, addr, duration, { value: fee });
  }

  public async nameRegisterExtended(controller: any, name: string, addr: HexAddress, duration: number, setReverse: number, keys: Array<string>, values: Array<string>) {
    let fee = await this.getFee(controller, name, duration)
    let keyhashes = keys.map(key => this.sha3(key))
    return controller.nameRegisterExtended(name, addr, duration, setReverse, keyhashes, values, { value: fee });
  }

  public async nameRegisterByManager(controller: any, name: string, addr: HexAddress, duration: number, setReverse: number, keys: Array<string>, values: Array<string>) {
    let keyhashes = keys.map(key => this.sha3(key))
    return controller.nameRegisterByManager(name, addr, duration, setReverse, keyhashes, values);
  }

  public async ownerOfId(registry: any, tokenId: TokenId) {
    return registry.ownerOf(tokenId);
  }

  public async ownerOfName(registry: any, name: DomainString) {
    let tokenId = this.getNamehash(name);
    return registry.ownerOf(tokenId);
  }

  public async exists(registry: any, name: DomainString): Promise<boolean> {
    let tokenId = this.getNamehash(name);
    return registry.exists(tokenId);
  }

  public async getOwner(registry: any, name: DomainString) {
    let tokenId = this.getNamehash(name);
    if (await registry.exists(tokenId)) {
      return registry.ownerOf(tokenId);
    } else {
      return this.emptyAddress;
    }
  }

  public async registerPrice(controller: any, name: LabelString, duration: number): Promise<BigNumber> {
    return controller.registerPrice(name, duration);
  }

  public async renewPrice(controller: any, name: LabelString, duration: number): Promise<BigNumber> {
    return controller.renewPrice(name, duration);
  }

  public async basePrice(controller: any, name: LabelString): Promise<BigNumber> {
    return controller.basePrice(name);
  }

  public async rentPrice(controller: any, name: LabelString, duration: number): Promise<BigNumber> {
    return controller.rentPrice(name, duration);
  }

  public async getPrices(controller: any) {
    return controller.getPrices();
  }

  public async getTokenPrice(controller: any) {
    return controller.getTokenPrice();
  }

  public async expire(registry: any, name: DomainString) {
    name = this.suffixTld(name);
    return registry.expire(this.getNamehash(name));
  }

  public async available(registry: any, name: DomainString) {
    name = this.suffixTld(name);
    return registry.available(this.getNamehash(name));
  }

  public async parent(registry: any, name: DomainString) {
    name = this.suffixTld(name);
    return registry.parent(this.getNamehash(name));
  }

  public async origin(registry: any, name: DomainString) {
    name = this.suffixTld(name);
    return registry.origin(this.getNamehash(name));
  }
  
  public async mintSubdomain(registry: any, newOwner: HexAddress, name: DomainString, label: LabelString) {
    let tokenId = this.getNamehash(name);
    return registry.mintSubdomain(newOwner, tokenId, label);
  }


  public async setName(resolver: any, addr: HexAddress, name: DomainString) {
    const tokenId = this.getNamehash(name);
    return resolver.setName(addr, tokenId);
  }

  public async getName(resolver: any, addr: HexAddress): Promise<BigNumber> {
    return resolver.getName(addr);
  }

  public async setNftName(resolver: any, nftAddr: HexAddress, nftTokenId: string, nameTokenId: TokenId) {
    return resolver.setNftName(nftAddr, nftTokenId, nameTokenId);
  }

  public async getNftName(resolver: any, nftAddr: HexAddress, nftTokenId: string) {
    return resolver.getNftName(nftAddr, nftTokenId);
  }

  public async approve(registry: any, name: DomainString, approved: HexAddress) {
    name = this.suffixTld(name);
    let tokenId = this.getNamehash(name);
    return registry.approve(approved, tokenId);  
  }


  public async getApproved(registry: any, name: DomainString): Promise<HexAddress> {
    name = this.suffixTld(name);
    let tokenId = this.getNamehash(name);
    return registry.getApproved(tokenId);
  }

  public async getKey(resolver: any, name: DomainString, key: string): Promise<string> {
    const tokenId = this.getNamehash(name);
    return resolver.get(key, tokenId);
  }

  public async setKeysByHash(resolver: any, name: DomainString, keys: string[], values: string[]) {
    const tokenId = this.getNamehash(name);
    return resolver.setManyByHash(keys, values, tokenId);
  }

  public async getKeys(resolver: any, name: DomainString, key: string[], resv?: IResolver): Promise<string[]> {
    const tokenId = this.getNamehash(name);
    return resolver.getMany(key, tokenId);
  }

  public async getKeysByHash(resolver: any, name: DomainString, key: string[], resv?: IResolver) {
    const tokenId: TokenId = this.getNamehash(name);
    return resolver.getManyByHash(key as any, tokenId);
  }

  public async renew(controller: any, label: LabelString, duration: number) {
    const price = await this.renewPrice(controller, label, duration);
    return controller.renew(label, duration, { value: price });
  }

  public async renewByManager(controller: any, label: LabelString, duration: number) {
    return controller.renewByManager(label, duration);
  }

  public async transferName(registry: any, name: DomainString, newOwner: HexAddress) {
    let namehash = this.getNamehash(name);
    let oldOwner = await this.getOwner(registry, name);
    return registry.transferFrom(oldOwner, newOwner, namehash);
  }

  public async burn(registry: any, name: string) {
    let tokenId = this.getNamehash(name);
    return registry.burn(tokenId);
  }
}