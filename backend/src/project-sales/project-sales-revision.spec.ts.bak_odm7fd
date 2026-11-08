import {ForbiddenException} from '@nestjs/common';
import {Role} from '@prisma/client';
import {ProjectSalesLaunchService} from './project-sales-launch.service';
import {ProjectSalesStockService} from './project-sales-stock.service';
import {UnitsService} from '../units/units.service';

describe('Project revision contracts',()=>{
 it('lists the specific units missing prices or photos',()=>{
  const service:any=new ProjectSalesLaunchService({} as any,{} as any);
  const project={setupStatus:'TAMAMLANDI',units:[{id:'u',number:'12',block:{code:'A'},price:0,images:[],mediaPackage:null}]};
  const readiness=service.buildPublishReadiness(project,{totalUnits:1,pricedUnits:0,imageCount:0,availableUnits:1});
  expect(readiness.ready).toBe(false);expect(readiness.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'price_u',message:expect.stringContaining('12')}),expect.objectContaining({code:'media_u'})]));
 });
 it('accepts direct photos without requiring a media package',()=>{
  const service:any=new ProjectSalesLaunchService({} as any,{} as any);
  expect(service.buildPublishReadiness({setupStatus:'TAMAMLANDI',units:[{id:'u',price:1,images:[{id:'image'}]}]},{totalUnits:1,pricedUnits:1,imageCount:1,availableUnits:1}).ready).toBe(true);
 });
 it('withdraws visibility without deleting project or media',async()=>{
  const updateMany=jest.fn().mockResolvedValue({count:2});const db={project:{findUnique:jest.fn().mockResolvedValue({id:'p',ownerId:'owner'})},unit:{updateMany}};
  const service=new ProjectSalesLaunchService(db as any,{} as any);
  await expect(service.withdrawFromPool('p','other',Role.MUTEAHHIT)).rejects.toBeInstanceOf(ForbiddenException);expect(updateMany).not.toHaveBeenCalled();
  expect((await service.withdrawFromPool('p','owner',Role.MUTEAHHIT)).withdrawnUnitCount).toBe(2);
  expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{projectId:'p',isSalesInventory:true,isPoolVisible:true},data:expect.objectContaining({isPoolVisible:false})}));
 });
 it('saves custom facade names independently from price/status',()=>{
  const service:any=new ProjectSalesStockService({} as any);
  expect(service.prepareUpdateData({facades:[' Ön cephe ','Bahçe cephesi','Ön cephe']})).toEqual({facades:['Ön cephe','Bahçe cephesi']});
  expect(()=>service.prepareUpdateData({facades:['']})).toThrow();expect(()=>service.prepareUpdateData({facades:['x'.repeat(81)]})).toThrow();
 });
 it('shows package photos and keeps contact data locked for a viewer',()=>{
  const service:any=new UnitsService({} as any);
  const unit={id:'u',images:[],features:[],allowPhoneCall:true,contactPhone:'05551112233',description:'Bilgi: 05551112233',project:{ownerId:'owner',latitude:37,longitude:29,owner:{role:'MUTEAHHIT'}},mediaPackage:{assets:[{id:'i',url:'https://example.test/unit.jpg',isCover:true}]}};
  const result=service.redactPoolUnitForViewer({id:'viewer',role:Role.EMLAKCI},unit,false);
  expect(result.images[0].url).toBe('https://example.test/unit.jpg');expect(result.contactPhone).toBeNull();expect(result.description).not.toContain('05551112233');expect(result.mediaPackage).toBeUndefined();
  expect(service.redactPoolUnitForViewer({id:'viewer',role:Role.EMLAKCI},unit,true).contactPhone).toBe('05551112233');
 });
});
