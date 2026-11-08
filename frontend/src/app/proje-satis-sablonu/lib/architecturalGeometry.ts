export type MetricShape = 'RECTANGLE' | 'SQUARE' | 'TRAPEZOID' | 'TRIANGLE';
export type MetricInput = { shape: MetricShape; width: string; depth: string; rearWidth: string; sideB: string; sideC: string };
export const EMPTY_METRIC: MetricInput = { shape:'RECTANGLE',width:'',depth:'',rearWidth:'',sideB:'',sideC:'' };
export const METRIC_SHAPES = [{value:'RECTANGLE',label:'Dikdörtgen'},{value:'SQUARE',label:'Kare'},{value:'TRAPEZOID',label:'Yamuk'},{value:'TRIANGLE',label:'Üçgen'}];
export type MetricPolygon = { width:number;depth:number;outline:[number,number][];measurements:MetricInput };
export function metricPolygon(input: MetricInput): MetricPolygon {
  const number=(value:string)=>{const result=Number(value.trim().replace(',','.'));if(!Number.isFinite(result)||result<0.1||result>10000)throw new Error('Ölçüler 0,1–10.000 metre arasında olmalıdır.');return result;};
  const width=number(input.width);
  let points:[number,number][];
  if(input.shape==='TRIANGLE') {
    const b=number(input.sideB),c=number(input.sideC);
    if(width+b<=c||width+c<=b||b+c<=width)throw new Error('Üç kenar bu ölçülerle bir üçgen oluşturmuyor.');
    const x=(width*width+c*c-b*b)/(2*width),height=Math.sqrt(c*c-x*x);
    points=[[0,0],[width,0],[x,height]];
  } else {
    const depth=input.shape==='SQUARE'?width:number(input.depth);
    const rear=input.shape==='TRAPEZOID'?number(input.rearWidth):width;
    points=[[-width/2,-depth/2],[width/2,-depth/2],[rear/2,depth/2],[-rear/2,depth/2]];
  }
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
  const minZ=Math.min(...points.map(p=>p[1])),maxZ=Math.max(...points.map(p=>p[1]));
  return {width:maxX-minX,depth:maxZ-minZ,outline:points.map(p=>[p[0]-(minX+maxX)/2,p[1]-(minZ+maxZ)/2]),measurements:{...input}};
}
export function validOutline(value:unknown):value is [number,number][] {
  return Array.isArray(value)&&value.length>=3&&value.length<=12&&value.every(point=>Array.isArray(point)&&point.length===2&&point.every(number=>typeof number==='number'&&Number.isFinite(number)));
}
