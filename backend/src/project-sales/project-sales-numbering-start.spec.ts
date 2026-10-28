import { ProjectSalesInventoryService } from './project-sales-inventory.service';

describe('Bağımsız bölüm başlangıç numarası',()=>{
  const service=new ProjectSalesInventoryService({} as any);
  const structure=['A','B'].map(code=>({id:code,code,normalizedCode:code,floors:[-1,0,1,2].map(level=>({id:`${code}-${level}`,level,label:String(level)}))}));
  const floor=(blockCode:string,floorLevel:number,startingSequence:number)=>({blockCode,floorLevel,numberPrefix:blockCode,startingSequence,unitGroups:[{type:'DAIRE',count:2,roomCount:'2+1',netArea:90,grossArea:110}]});
  const prepare=(floorPlans:unknown[],numberingMode='CONTINUOUS')=>(service as any).prepareInventory('p',null,null,structure,{numberingMode,floorPlans,projectSpaces:[]});
  it('ilk zemin/normal katın başlangıcından devam eder; bodrum ayrı seri kullanır',()=>{
    const result=prepare([floor('A',-1,3),floor('A',0,10),floor('A',1,1),floor('A',2,1)]);
    expect(result.units.map((unit:any)=>unit.number)).toEqual(['A-B1-3','A-B1-4','A-Z-10','A-Z-11','A-12','A-13','A-14','A-15']);
  });
  it('her blok kendi başlangıç numarasını korur',()=>{
    const result=prepare([floor('A',1,20),floor('A',2,1),floor('B',1,50)]);
    expect(result.units.map((unit:any)=>unit.number)).toEqual(['A-20','A-21','A-22','A-23','B-50','B-51']);
  });
  it('kat kodlu numaralandırma aynı kalır',()=>{
    const result=prepare([floor('A',1,1),floor('A',2,1)],'FLOOR_CODED');
    expect(result.units.map((unit:any)=>unit.number)).toEqual(['A-101','A-102','A-201','A-202']);
  });
});
