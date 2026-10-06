// ZIP sem compressão (método 0): PNG já vem comprimido, então só empacotamos. Nomes em UTF-8.
const TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
export function crc32(bytes){
  let c=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++)c=TABLE[(c^bytes[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
export function makeZip(files){
  const enc=new TextEncoder();
  const entries=files.map(f=>({name:enc.encode(f.name),data:f.data,crc:crc32(f.data)}));
  let size=22;for(const e of entries)size+=30+e.name.length+e.data.length+46+e.name.length;
  const out=new Uint8Array(size),v=new DataView(out.buffer);
  let pos=0;const offsets=[];
  for(const e of entries){
    offsets.push(pos);
    v.setUint32(pos,0x04034b50,true);v.setUint16(pos+4,20,true);v.setUint16(pos+6,0x0800,true);v.setUint16(pos+8,0,true);
    v.setUint16(pos+10,0,true);v.setUint16(pos+12,0x21,true);
    v.setUint32(pos+14,e.crc,true);v.setUint32(pos+18,e.data.length,true);v.setUint32(pos+22,e.data.length,true);
    v.setUint16(pos+26,e.name.length,true);v.setUint16(pos+28,0,true);
    out.set(e.name,pos+30);out.set(e.data,pos+30+e.name.length);pos+=30+e.name.length+e.data.length;
  }
  const cd=pos;
  entries.forEach((e,i)=>{
    v.setUint32(pos,0x02014b50,true);v.setUint16(pos+4,20,true);v.setUint16(pos+6,20,true);v.setUint16(pos+8,0x0800,true);v.setUint16(pos+10,0,true);
    v.setUint16(pos+12,0,true);v.setUint16(pos+14,0x21,true);
    v.setUint32(pos+16,e.crc,true);v.setUint32(pos+20,e.data.length,true);v.setUint32(pos+24,e.data.length,true);
    v.setUint16(pos+28,e.name.length,true);v.setUint16(pos+30,0,true);v.setUint16(pos+32,0,true);v.setUint16(pos+34,0,true);v.setUint16(pos+36,0,true);
    v.setUint32(pos+38,0,true);v.setUint32(pos+42,offsets[i],true);
    out.set(e.name,pos+46);pos+=46+e.name.length;
  });
  v.setUint32(pos,0x06054b50,true);v.setUint16(pos+8,entries.length,true);v.setUint16(pos+10,entries.length,true);
  v.setUint32(pos+12,pos-cd,true);v.setUint32(pos+16,cd,true);
  return out;
}
