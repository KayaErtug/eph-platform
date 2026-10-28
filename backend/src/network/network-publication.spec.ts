import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { NetworkService } from './network.service';
import { PropertyCriteriaService } from '../property-criteria/property-criteria.service';
import { PropertyDemandAdapter } from '../property-demand/property-demand.adapter';

describe('Talep publication debit and receipt', () => {
  let service: NetworkService, db: any, state: any, adapter: PropertyDemandAdapter;
  const dto: any = { type:'PORTFOY_ARIYORUM',title:'Denizli daire talebi',description:'Merkezefendi ilçesinde satılık daire arıyorum.',propertyTypes:['DAIRE'],roomCounts:['3+1'],city:'Denizli',maxBudget:8000000,priceCurrency:'TRY' };
  beforeEach(() => {
    state={balance:100,totalSpent:0,active:true,posts:[],movements:[],role:Role.EMLAKCI,committed:false};
    db={
      $executeRaw:jest.fn().mockResolvedValue(1), $queryRaw:jest.fn().mockResolvedValue([]),
      user:{findUnique:jest.fn(async()=>({id:'actor',role:state.role,officeId:null}))}, kullaniciUyelikPaketi:{findFirst:jest.fn().mockResolvedValue(null)}, office:{findFirst:jest.fn().mockResolvedValue(null)}, systemSetting:{findUnique:jest.fn().mockResolvedValue(null)},
      networkPost:{create:jest.fn(async ({data})=>{const post={...data,createdAt:new Date('2026-10-14T12:45:00Z'),User:{id:'actor',role:state.role,capabilities:[]}};state.posts.push(post);return post;})},
      kontorCuzdani:{findUnique:jest.fn(async()=>({kullaniciId:'actor',bakiye:state.balance,aktifMi:state.active})),create:jest.fn(async()=>({kullaniciId:'actor',bakiye:0,aktifMi:true})),update:jest.fn(async({data})=>{state.balance-=data.bakiye.decrement;state.totalSpent+=data.toplamHarcama.increment;return {bakiye:state.balance,kullaniciId:'actor'};})},
      kontorHareketi:{create:jest.fn(async({data})=>{const movement={id:'movement-'+(state.movements.length+1),...data};state.movements.push(movement);return movement;})},
    };
    db.$transaction=jest.fn(async(callback)=>{const before=structuredClone(state);try {const result=await callback(db);state.committed=true;return result;}catch(error){state=before;throw error;}});
    adapter=new PropertyDemandAdapter();
    service=new NetworkService(db,{} as any,new PropertyCriteriaService(),adapter,{} as any,{} as any);
    jest.spyOn(service as any,'validateForumPostInput').mockResolvedValue({category:'PORTFOY_ARIYORUM',title:dto.title,description:dto.description,requestType:'PORTFOY_SATILIK'});
    jest.spyOn(service as any,'validatePropertyDemandInput').mockImplementation(()=>undefined);
    service.registerRequestMatchHandler(async()=>{expect(state.committed).toBe(true);expect(state.movements).toHaveLength(1);});
  });
  it.each([Role.EMLAKCI,Role.MUTEAHHIT,Role.INSAAT_FIRMASI,Role.SUPER_ADMIN])('charges 25 PK and returns actual ledger values for %s',async(role)=>{
    state.role=role;const result=await service.create(dto,'actor');
    expect(state.balance).toBe(75);expect(state.totalSpent).toBe(25);expect(state.posts).toHaveLength(1);expect(state.movements).toHaveLength(1);
    expect(state.movements[0]).toMatchObject({kullaniciId:'actor',olusturanId:'actor',miktar:25,oncekiBakiye:100,sonrakiBakiye:75,ilgiliKayitId:result.id,ilgiliKayitTuru:'NETWORK_POST',hareketTuru:'HARCAMA',islemTuru:'FORUM_TALEP_OLUSTURMA'});
    expect(result.publicationReceipt).toEqual({ok:true,postId:result.id,actorId:'actor',operationId:state.movements[0].id,spent:25,previousBalance:100,remainingBalance:75,walletSource:'PERSONAL',walletOfficeId:null,replayed:false});
    expect(db.$transaction).toHaveBeenCalledTimes(1);expect(db.$executeRaw).toHaveBeenCalled();
  });
  it('ignores client-provided price, user, wallet or receipt',async()=>{
    const result=await service.create({...dto,publicationReceipt:{spent:0},amount:0,walletSource:'OFFICE',userId:'other'} as any,'actor');expect(result.publicationReceipt.spent).toBe(25);expect(state.movements[0].kullaniciId).toBe('actor');
  });
  it('insufficient balance rolls back the created post',async()=>{
    state.balance=24;await expect(service.create(dto,'actor')).rejects.toBeInstanceOf(BadRequestException);expect(state.posts).toHaveLength(0);expect(state.balance).toBe(24);expect(state.movements).toHaveLength(0);
  });
  it('inactive wallet leaves no post or debit',async()=>{
    state.active=false;await expect(service.create(dto,'actor')).rejects.toBeInstanceOf(BadRequestException);expect(state.posts).toHaveLength(0);expect(state.balance).toBe(100);
  });
  it('missing wallet cannot create a free publication',async()=>{
    db.kontorCuzdani.findUnique.mockResolvedValue(null);await expect(service.create(dto,'actor')).rejects.toBeInstanceOf(BadRequestException);expect(state.posts).toHaveLength(0);expect(state.movements).toHaveLength(0);
  });
  it('ledger failure rolls back wallet and publication',async()=>{
    db.kontorHareketi.create.mockRejectedValue(new Error('ledger failed'));await expect(service.create(dto,'actor')).rejects.toThrow('ledger failed');expect(state.balance).toBe(100);expect(state.totalSpent).toBe(0);expect(state.posts).toHaveLength(0);
  });
  it('serialization failure rolls back the debit and post',async()=>{
    jest.spyOn(adapter,'fromNetworkPost').mockImplementation(()=>{throw new Error('serializer failed');});await expect(service.create(dto,'actor')).rejects.toThrow('serializer failed');expect(state.posts).toHaveLength(0);expect(state.movements).toHaveLength(0);expect(state.balance).toBe(100);
  });
  it('validation failure does not start a transaction',async()=>{
    (service as any).validateForumPostInput.mockRejectedValue(new BadRequestException('invalid input'));await expect(service.create(dto,'actor')).rejects.toThrow('invalid input');expect(db.$transaction).not.toHaveBeenCalled();expect(state.balance).toBe(100);
  });
  it('matching outage after commit preserves receipt and one debit',async()=>{
    service.registerRequestMatchHandler(async()=>{throw new Error('matching unavailable');});const result=await service.create(dto,'actor');expect(result.publicationReceipt.spent).toBe(25);expect(state.posts).toHaveLength(1);expect(state.movements).toHaveLength(1);expect(state.balance).toBe(75);
  });
});
