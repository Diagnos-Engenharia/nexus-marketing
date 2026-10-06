'use client';

import {useEffect,useRef} from 'react';

// Pré-visualização do documento A4 dentro do app. "Salvar como PDF" usa a impressão do navegador,
// que respeita o tamanho A4 e imprime os fundos e as cores da marca.
export function DocumentPreview({html,title,filename,onClose}:{html:string;title:string;filename:string;onClose:()=>void}){
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose]);
  const print=()=>{const w=frame.current?.contentWindow;if(w){w.focus();w.print()}};
  const download=()=>{const u=URL.createObjectURL(new Blob([html],{type:'text/html'}));const a=document.createElement('a');a.href=u;a.download=`${filename}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
  return <div className="docOverlay" role="dialog" aria-modal="true" aria-label={title}>
    <div className="docBar"><div><small>PRÉ-VISUALIZAÇÃO · A4</small><b>{title}</b></div><div className="buttonRow"><button className="secondary" onClick={download}>Baixar HTML</button><button className="primary" onClick={print}>Salvar como PDF</button><button className="secondary" onClick={onClose}>Fechar</button></div></div>
    <iframe ref={frame} className="docFrame" title={title} srcDoc={html}/>
  </div>;
}
