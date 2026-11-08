import {reverseGoogleProjectLocation} from '@/components/stok/GoogleGeoPicker';
import {fetchProvinceOptions,fetchDistrictOptions,fetchPlaceOptions,type LocationOption} from '@/components/stok/locationData';

const key=(value:string)=>value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\b(mahallesi|mahalle|mah|ili|ilcesi)\b/g,'').replace(/[^a-z0-9]/g,'');
const match=(value:string,options:LocationOption[])=>options.find(option=>key(option.name)===key(value));

export async function resolveProjectLocation(latitude:number,longitude:number){
 const raw=await reverseGoogleProjectLocation(latitude,longitude);
 const province=match(raw.city,await fetchProvinceOptions());
 const district=province?match(raw.district,await fetchDistrictOptions(province.name)):undefined;
 const place=province&&district?match(raw.neighborhood,await fetchPlaceOptions(province.name,district.name,district.id)):undefined;
 return {...raw,city:province?.name||'',district:district?.name||'',neighborhood:place?.name||''};
}
