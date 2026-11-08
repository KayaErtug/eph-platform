"use client";
import {useState} from 'react';
import api from '@/lib/api';
import {inputStyle,secondaryButtonStyle} from '../lib/projectSalesStyles';

export default function UnitFacadeEditor({unitId,facades}:{unitId:string;facades:string[]}) {
 const [text,setText]=useState(facades.join(', '));const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const save=async()=>{if(busy)return;setBusy(true);setNotice('');try{await api.patch(`/project-sales/units/${unitId}/sales-stock`,{facades:text.split(',').map(value=>value.trim()).filter(Boolean)});setNotice('Cephe bilgileri kaydedildi.');}catch(error){setNotice((error as {response?:{data?:{message?:string}}}).response?.data?.message||'Cephe bilgileri kaydedilemedi.');}finally{setBusy(false);}};
 return <details><summary style={{cursor:'pointer',padding:'10px 0',fontWeight:700}}>Cephe Bilgilerini Belirle</summary><label style={{display:'grid',gap:8,fontSize:12}}>Bölümün cepheleri<input aria-label={`${unitId} cepheleri`} value={text} onChange={event=>setText(event.target.value)} placeholder="Ön cephe, Bahçe cephesi" style={inputStyle}/></label><p style={{fontSize:12,lineHeight:1.6}}>Ön/arka, havuz/bahçe veya yol cephesi gibi adları virgülle ayırın. Bu bilgiler yalnız bu numaralı bölüme kaydedilir.</p><button type="button" style={secondaryButtonStyle} disabled={busy} onClick={()=>void save()}>{busy?'Kaydediliyor…':'Cepheleri Kaydet'}</button>{notice&&<p role="status" style={{fontSize:12}}>{notice}</p>}</details>;
}
