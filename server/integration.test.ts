import test from 'node:test';
import assert from 'node:assert/strict';

test('HTTP contract: filters, validation, private endpoints, docs and throttling',async()=>{
  // Exercise compiled decorators, not only individual validation functions.
  delete process.env.DATABASE_URL;
  const {createApp}=require('../build-server/server/main.js');
  const app=await createApp();
  await app.listen(0,'127.0.0.1');
  const address=app.getHttpServer().address();
  const base=`http://127.0.0.1:${address.port}/api`;
  try{
    const response=await fetch(`${base}/properties?q=Pune&maxRent=20000`);
    assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.total,1);assert.equal(data.items[0].locality,'Kharadi');
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await fetch(`${base}/properties?bedrooms=999`)).status,400);
    assert.equal((await fetch(`${base}/properties?unknown=1`)).status,400);
    assert.equal((await fetch(`${base}/properties/nonexistent`)).status,404);
    for(const path of ['favourites','my/properties','enquiries'])assert.equal((await fetch(`${base}/${path}`)).status,401);
    const invalid=await fetch(`${base}/properties`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'bad',ownerId:'someone-else'})});assert.equal(invalid.status,400);
    const docs=await (await fetch(`${base}/docs-json`)).json();assert.ok(docs.paths['/api/properties']);assert.ok(docs.paths['/api/uploads']);
    let limited=false;
    for(let index=0;index<125;index++){if((await fetch(`${base}/health`)).status===429){limited=true;break;}}
    assert.ok(limited,'repeated requests must be throttled');
  }finally{await app.close();}
});

