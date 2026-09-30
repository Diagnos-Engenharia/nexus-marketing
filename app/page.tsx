export default function Home(){
  return (
    <main style={{minHeight:'100vh',background:'#07111f',color:'#edf4ff',fontFamily:'Arial, sans-serif',padding:'48px'}}>
      <div style={{maxWidth:980,margin:'0 auto'}}>
        <div style={{fontSize:12,letterSpacing:3,color:'#5ba7ff',fontWeight:700}}>NEXUS DIGITAL</div>
        <h1 style={{fontSize:42,margin:'14px 0 8px'}}>Nexus Marketing IA</h1>
        <p style={{fontSize:18,color:'#aebcd0',lineHeight:1.6,maxWidth:760}}>
          Marketing Operating System para planejamento, mídia, criação e mensuração.
        </p>
        <section style={{marginTop:30,border:'1px solid #223754',borderRadius:16,padding:24,background:'#0d1a2b'}}>
          <strong style={{display:'block',fontSize:18}}>Deploy de estabilização ativo</strong>
          <p style={{color:'#8fa0b8',lineHeight:1.6}}>
            O projeto está conectado ao GitHub e à Vercel. O motor estratégico permanece no repositório enquanto validamos o pipeline de produção.
          </p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {['Planejamento','Google × Meta','GBP × Ads','RETINA','Performance','Experimentos A/B'].map(x=>
              <span key={x} style={{border:'1px solid #315f99',borderRadius:999,padding:'7px 10px',fontSize:12,color:'#76b3ff'}}>{x}</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
