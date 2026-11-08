"use client";
import { useState } from 'react';
import { EMPTY_METRIC, METRIC_SHAPES, metricPolygon, type MetricInput } from '../../lib/architecturalGeometry';
import type { ProjectSceneData } from './projectSceneTypes';

export default function ArchitecturalMeasurementsWeb({scene,onApply,disabled}:{scene:ProjectSceneData;onApply:(next:ProjectSceneData)=>void;disabled:boolean}) {
  const [target,setTarget]=useState('PLOT');const[input,setInput]=useState<MetricInput>({...EMPTY_METRIC});const[error,setError]=useState('');
  const choose=(value:string)=>{setTarget(value);const area=value==='PLOT'?scene.plot:scene.elements.find(item=>item.id===value);setInput({...EMPTY_METRIC,...area?.measurements});setError('');};
  const patch=(key:keyof MetricInput,value:string)=>{setInput(current=>({...current,[key]:value}));setError('');};
  const field=(label:string,key:keyof MetricInput)=><label className="grid gap-1 text-xs font-bold text-slate-700">{label}<input aria-label={label} inputMode="decimal" value={input[key]} onChange={event=>patch(key,event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900"/></label>;
  return <details className="rounded-2xl border border-slate-300 bg-white p-4" onToggle={event=>{if(event.currentTarget.open)choose(target);}}><summary className="cursor-pointer text-sm font-black text-slate-800">Mimari Projedeki Ölçüler · Opsiyonel</summary><fieldset disabled={disabled} className="mt-3 grid gap-3 border-0 p-0">
    <p className="text-xs leading-5 text-slate-500">Arsa ve bina ölçüleri girildiğinde 3D taslak bu ölçülere göre çizilir. Bu adımı atlayabilirsiniz.</p>
    <select aria-label="Ölçü girilecek alan" value={target} onChange={event=>choose(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3"><option value="PLOT">Arsa</option>{scene.elements.filter(item=>item.type==='BLOCK').map(item=><option key={item.id} value={item.id}>{item.name||item.code}</option>)}</select>
    <select aria-label="Geometrik şekil" value={input.shape} onChange={event=>patch('shape',event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3">{METRIC_SHAPES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
    <div className="grid gap-3 sm:grid-cols-2">{field(input.shape==='TRIANGLE'?'1. Kenar (m)':input.shape==='TRAPEZOID'?'Ön Cephe (m)':'Genişlik / Kenar (m)','width')}{input.shape==='RECTANGLE'||input.shape==='TRAPEZOID'?field('Dik Derinlik (m)','depth'):null}{input.shape==='TRAPEZOID'?field('Arka Cephe (m)','rearWidth'):null}{input.shape==='TRIANGLE'?<>{field('2. Kenar (m)','sideB')}{field('3. Kenar (m)','sideC')}</>:null}</div>
    {error?<p role="alert" className="text-xs text-red-700">{error}</p>:null}
    <button type="button" onClick={()=>{try{const shape=metricPolygon(input);onApply(target==='PLOT'?{...scene,plot:{...scene.plot,...shape}}:{...scene,elements:scene.elements.map(item=>item.id===target?{...item,...shape,size:{...item.size,width:shape.width,depth:shape.depth}}:item)});setError('');}catch(issue){setError(issue instanceof Error?issue.message:'Ölçüleri kontrol edin.');}}} className="min-h-11 rounded-xl bg-blue-50 px-4 text-sm font-bold text-blue-700">Ölçüleri 3D Taslağa Uygula</button>
    <p className="text-xs leading-5 text-slate-500">Yerleşimi inceleyin; blok konumlarını gerekirse düzenleyip Kaydet düğmesiyle onaylayın.</p>
  </fieldset></details>;
}
